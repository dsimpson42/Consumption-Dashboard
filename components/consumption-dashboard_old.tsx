"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Expanded mock CSV data
const csvData = `Subscription Id,Customer Name,Directs,Territory Owner E-mail,Pricing Model,Quarterly Run Rate,Fiscal Quarter,Fiscal Month,Actual Consumption (k$)
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q1,FY25-JUN,36.9072
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q1,FY25-JUL,38.09473
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q1,FY25-AUG,36.81312
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,108.06432,FY25-Q2,FY25-SEP,24.93792
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q2,FY25-OCT,35.12345
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q2,FY25-NOV,33.98765
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,105.23456,FY25-Q3,FY25-DEC,37.45678
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q3,FY25-JAN,34.56789
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q3,FY25-FEB,32.10987
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,110.34567,FY25-Q4,FY25-MAR,38.76543
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q4,FY25-APR,35.87654
10025632,Virginia Alcoholic Beverage Control Authority,SLED East,loren.maughlin@oracle.com,Funded Allocation,,FY25-Q4,FY25-MAY,39.12345
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q1,FY25-JUN,42.5678
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q1,FY25-JUL,44.3210
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q1,FY25-AUG,41.9876
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,125.4321,FY25-Q2,FY25-SEP,43.2109
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q2,FY25-OCT,45.6789
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q2,FY25-NOV,40.1234
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,130.5678,FY25-Q3,FY25-DEC,46.7890
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q3,FY25-JAN,42.3456
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q3,FY25-FEB,39.8765
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,135.6789,FY25-Q4,FY25-MAR,47.9012
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q4,FY25-APR,44.5678
10025633,Arizona Department of Transportation,SLED West,john.doe@oracle.com,Funded Allocation,,FY25-Q4,FY25-MAY,48.2345`

type CSVRow = {
  [key: string]: string
}

type NeFromOscRow = {
  customer: string;
  neAmount: number;
  closeDate: string;
  probability: number;
  [key: string]: string | number;
};

type NonBookingWorkloadRow = {
  customer: string;
  [key: string]: string | number;
};

const parseCsvData = (csv: string): CSVRow[] => {
  const lines = csv.split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]
      return obj
    }, {} as CSVRow)
  })
}

const monthMap: { [key: string]: string } = {
  JUN: 'june',
  JUL: 'july',
  AUG: 'august',
  SEP: 'september',
  OCT: 'october',
  NOV: 'november',
  DEC: 'december',
  JAN: 'january',
  FEB: 'february',
  MAR: 'march',
  APR: 'april',
  MAY: 'may'
}

const months = ['june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march', 'april', 'may']

export function ConsumptionDashboardComponent() {
  const [dashboardData, setDashboardData] = useState({
    territoryOwner: "Baylor Cocke",
    territoryOwnerEmail: "loren.maughlin@oracle.com",
    neTarget: 1600000,
    consumptionBaseline: 1365470,
    consumptionGrowthTarget: 1200000,
    totalConsumptionTarget: 2565470,
  })

  const [existingSubscriptions, setExistingSubscriptions] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, info])
  }

  const [neFromOsc, setNeFromOsc] = useState<NeFromOscRow[]>([
    {
      customer: "City of Tempe",
      neAmount: 85000,
      closeDate: "11/12/2024",
      probability: 60,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
    },
    {
      customer: "City of Phoenix",
      neAmount: 636000,
      closeDate: "1/19/2025",
      probability: 50,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
    },
    {
      customer: "Arizona Dept of Revenue",
      neAmount: 160000,
      closeDate: "3/10/2025",
      probability: 30,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
    },
  ])

  const [nonBookingWorkloads, setNonBookingWorkloads] = useState<NonBookingWorkloadRow[]>([
    {
      customer: "Arizona Health Care Cost Containment System",
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
    }
  ])

  const calculateTotal = (row: Record<string, number | string>) => {
    return Object.entries(row).reduce((acc, [key, value]) => {
      if (months.includes(key) && typeof value === 'number') {
        return acc + value
      }
      return acc
    }, 0)
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-'
    const inK = amount / 1000
    if (inK >= 1000) {
      return `${(inK / 1000).toFixed(1).replace(/\.0$/, '')}M`
    }
    return `${inK.toFixed(1).replace(/\.0$/, '')}k`
  }

  const parseCurrencyInput = (value: string): number => {
    const numericValue = value.replace(/[^0-9.-]+/g, "")
    return parseFloat(numericValue) * 1000 // Convert back to full amount
  }

  const handleNeChange = (index: number, field: string, value: string) => {
    const newNeFromOsc = [...neFromOsc];
    (newNeFromOsc[index] as any)[field] = parseCurrencyInput(value);
    setNeFromOsc(newNeFromOsc);
  }

  const handleNonBookingChange = (index: number, field: string, value: string) => {
    const newNonBookingWorkloads = [...nonBookingWorkloads];
    (newNonBookingWorkloads[index] as any)[field] = parseCurrencyInput(value);
    setNonBookingWorkloads(newNonBookingWorkloads);
  }

  const handleDashboardDataChange = (field: string, value: string) => {
    setDashboardData(prev => ({
      ...prev,
      [field]: value
    }))

    if (field === 'territoryOwnerEmail') {
      updateExistingSubscriptions(value)
    }
  }

  const updateExistingSubscriptions = (email: string) => {
    addDebugInfo(`Updating existing subscriptions for email: ${email}`)
    const parsedData = parseCsvData(csvData)
    addDebugInfo(`Parsed CSV data: ${JSON.stringify(parsedData)}`)
    const filteredData = parsedData.filter(row => row['Territory Owner E-mail'] === email)
    addDebugInfo(`Filtered data: ${JSON.stringify(filteredData)}`)
    
    const subscriptions = filteredData.reduce((acc, row) => {
      const customer = row['Customer Name']
      const monthAbbr = row['Fiscal Month'].slice(5)
      const month = monthMap[monthAbbr as keyof typeof monthMap]
      const consumption = parseFloat(row['Actual Consumption (k$)']) * 1000

      const existingCustomer = acc.find(sub => sub.customer === customer)
      if (existingCustomer) {
        existingCustomer[month] = consumption
      } else {
        const newCustomer = {
          customer,
          june: 0, july: 0, august: 0, september: 0, october: 0, november: 0,
          december: 0, january: 0, february: 0, march: 0, april: 0, may: 0,
          [month]: consumption
        }
        acc.push(newCustomer)
      }
      return acc
    }, [] as any[])

    addDebugInfo(`Updated subscriptions: ${JSON.stringify(subscriptions)}`)
    setExistingSubscriptions(subscriptions)
  }

  useEffect(() => {
    addDebugInfo("Initial useEffect running")
    updateExistingSubscriptions(dashboardData.territoryOwnerEmail)
  }, [])

  useEffect(() => {
    addDebugInfo(`existingSubscriptions updated: ${JSON.stringify(existingSubscriptions)}`)
  }, [existingSubscriptions])

  const totalConsumption = useMemo(() => {
    const result: { [key: string]: number | string } = { total: 0, customer: "Summary" }

    months.forEach(month => {
      const monthTotal = 
        existingSubscriptions.reduce((acc, row) => acc + (Number(row[month]) || 0), 0) +
        neFromOsc.reduce((acc, row) => acc + (Number(row[month]) || 0), 0) +
        nonBookingWorkloads.reduce((acc, row) => acc + (Number(row[month]) || 0), 0);
      
      result[month] = monthTotal;
      result.total = (result.total as number) + monthTotal;
    })

    return result
  }, [existingSubscriptions, neFromOsc, nonBookingWorkloads])

  const totalConsumptionTarget = useMemo(() => {
    const monthlyTarget = dashboardData.totalConsumptionTarget / 12
    const result: { [key: string]: number | string } = { total: dashboardData.totalConsumptionTarget, customer: "Total Consumption Target" }

    months.forEach(month => {
      result[month] = monthlyTarget
    })

    return result
  }, [dashboardData.totalConsumptionTarget])

  
  const gapToGoal = useMemo(() => {
      const result: { [key: string]: number | string } = { total: 0, customer: "Gap to Goal" };
    
      months.forEach(month => {
        const targetForMonth = (totalConsumptionTarget[month] as number);
        const actualForMonth = (totalConsumption[month] as number);
        const gap = targetForMonth - actualForMonth;
        result[month] = gap;
        result.total = (result.total as number) + gap;
      });
    
      return result;
    }, [totalConsumption, totalConsumptionTarget, months]);
        
        const neTargetProgress = useMemo(() => {
          const totalNeAmount = neFromOsc.reduce((acc, row) => acc + row.neAmount, 0)
          return (totalNeAmount / dashboardData.neTarget) * 100
        }, [neFromOsc, dashboardData.neTarget])
        
        const consumptionProgress = useMemo(() => {
          const consumptionGrowth = (totalConsumption.total as number) - dashboardData.consumptionBaseline
          const progress = (consumptionGrowth / dashboardData.consumptionGrowthTarget) * 100
          return Math.min(Math.max(progress, 0), 100) // Ensure the progress is between 0 and 100
        }, [totalConsumption.total, dashboardData.consumptionBaseline, dashboardData.consumptionGrowthTarget])
        
        const InputPopover = ({ value, onChange, label }: { value: number, onChange: (value: string) => void, label: string }) => {
          const [inputValue, setInputValue] = useState(value === 0 ? '' : formatCurrency(value).replace(/[kM]$/, ''))
          const inputRef = useRef<HTMLInputElement>(null)
        
          useEffect(() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }, [])
        
          const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value)
          }
        
          const handleSubmit = () => {
            onChange(inputValue === '' ? '0' : inputValue)
          }
        
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="w-full h-full p-0 font-normal">
                  {formatCurrency(value)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">{label}</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter the value in thousands (k). Leave blank for zero.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        className="col-span-2 h-8"
                      />
                    </div>
                    <Button onClick={handleSubmit}>Save changes</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        }
      
        return (
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Consumption Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Territory Owner</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={dashboardData.territoryOwner}
                    onChange={(e) => handleDashboardDataChange('territoryOwner', e.target.value)}
                    className="mb-2"
                  />
                  <Input
                    value={dashboardData.territoryOwnerEmail}
                    onChange={(e) => handleDashboardDataChange('territoryOwnerEmail', e.target.value)}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>NE Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <InputPopover
                    value={dashboardData.neTarget}
                    onChange={(value) => handleDashboardDataChange('neTarget', value)}
                    label="NE Target"
                  />
                  <div className="mt-2">Progress: {neTargetProgress.toFixed(2)}%</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Consumption Growth Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <InputPopover
                    value={dashboardData.consumptionGrowthTarget}
                    onChange={(value) => handleDashboardDataChange('consumptionGrowthTarget', value)}
                    label="Consumption Growth Target"
                  />
                  <div className="mt-2">Progress: {consumptionProgress.toFixed(2)}%</div>
                </CardContent>
              </Card>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  {months.map((month) => (
                    <TableHead key={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingSubscriptions.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.customer}</TableCell>
                    {months.map((month) => (
                      <TableCell key={month}>{formatCurrency(row[month] as number)}</TableCell>
                    ))}
                    <TableCell>{formatCurrency(calculateTotal(row))}</TableCell>
                  </TableRow>
                ))}
                {neFromOsc.map((row, index) => (
                  <TableRow key={`ne-${index}`}>
                    <TableCell>{row.customer}</TableCell>
                    {months.map((month) => (
                      <TableCell key={month}>
                        <InputPopover
                          value={row[month] as number}
                          onChange={(value) => handleNeChange(index, month, value)}
                          label={`${row.customer} - ${month}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell>{formatCurrency(calculateTotal(row))}</TableCell>
                  </TableRow>
                ))}
                {nonBookingWorkloads.map((row, index) => (
                  <TableRow key={`nbw-${index}`}>
                    <TableCell>{row.customer}</TableCell>
                    {months.map((month) => (
                      <TableCell key={month}>
                        <InputPopover
                          value={row[month] as number}
                          onChange={(value) => handleNonBookingChange(index, month, value)}
                          label={`${row.customer} - ${month}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell>{formatCurrency(calculateTotal(row))}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>{totalConsumption.customer}</TableCell>
                  {months.map((month) => (
                    <TableCell key={month}>{formatCurrency(totalConsumption[month] as number)}</TableCell>
                  ))}
                  <TableCell>{formatCurrency(totalConsumption.total as number)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{totalConsumptionTarget.customer}</TableCell>
                  {months.map((month) => (
                    <TableCell key={month}>{formatCurrency(totalConsumptionTarget[month] as number)}</TableCell>
                  ))}
                  <TableCell>{formatCurrency(totalConsumptionTarget.total as number)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{gapToGoal.customer}</TableCell>
                  {months.map((month) => (
                    <TableCell key={month}>{formatCurrency(gapToGoal[month] as number)}</TableCell>
                  ))}
                  <TableCell>{formatCurrency(gapToGoal.total as number)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-2">Debug Information</h2>
              <pre className="bg-gray-100 p-4 rounded">
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </pre>
            </div>
          </div>
        )
      }