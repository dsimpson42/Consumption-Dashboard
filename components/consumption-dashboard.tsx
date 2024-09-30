"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import debounce from 'lodash.debounce'
import * as TableComponents from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Papa from 'papaparse'
import { EditableMoneyCell } from "./editable-money-cell"
import { Package2, DollarSign, TrendingUp, HelpCircle, BarChart3 } from 'lucide-react'

type CSVRow = {
  [key: string]: string
}

type Subscription = {
  customer: string;
  june?: number;
  july?: number;
  august?: number;
  september?: number;
  october?: number;
  november?: number;
  december?: number;
  january?: number;
  february?: number;
  march?: number;
  april?: number;
  may?: number;
  total: number;
  neAmount?: number;
  wlAmount?: number;
  closeDate?: string;
  probability?: number;
  [key: string]: string | number | undefined;
}

const parseCsvData = (csvString: string): Record<string, string>[] => {
  const lines = csvString.split('\n')
  const headers = lines[0].split(',').map(header => header.trim())
  console.log('CSV Headers:', headers)

  return lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim())
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]
      return obj
    }, {} as Record<string, string>)
  })
}

const monthMap = {
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

interface DashboardData {
  territoryOwnerEmail: string;
  neTarget: number;
  consumptionBaseline: number;
  consumptionGrowthTarget: number;
}

interface EditableCurrencyFieldProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

interface GapToGoal {
  customer: string;
  total: number;
  [key: string]: number | string;
}

interface InputPopoverProps {
  value: number | undefined;
  onChange: (value: string) => void;
  label: string;
}

export function EditableCurrencyField({ value, onChange, label }: EditableCurrencyFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() ?? '0');

  const formatCurrency = (val: number | undefined): string => {
    if (val === undefined) return '-';
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `$${(val / 1000).toFixed(0)}K`;
    } else {
      return `$${val.toFixed(0)}`;
    }
  };

  const handleSave = () => {
    const newValue = parseFloat(tempValue) || 0;
    onChange(newValue);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="p-0">
            {formatCurrency(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">{label}</h4>
              <p className="text-sm text-muted-foreground">
                Enter the new value (in dollars).
              </p>
            </div>
            <div className="grid gap-2">
              <Input
                id="value"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="bg-gray-700 text-gray-100"
              />
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-t ${className}`} />;
}

function ProgressBar({ value, label, color }: { value: number, label: string, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm font-medium text-gray-300">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${color}`} 
          style={{ width: `${Math.min(value, 100)}%` }}
        ></div>
      </div>
    </div>
  )
}

export default function ConsumptionDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    territoryOwnerEmail: '',
    neTarget: 0,
    consumptionBaseline: 0,
    consumptionGrowthTarget: 0,
  });

  const [existingSubscriptions, setExistingSubscriptions] = useState<Subscription[]>([]);
  const [neFromOsc, setNeFromOsc] = useState<Subscription[]>([]);
  const [nbWorkloads, setNbWorkloads] = useState<Subscription[]>([]);
  const [csvData, setCsvData] = useState('');
  const [neCsvData, setNeCsvData] = useState('');
  const [nbWorkloadsCsvData, setNbWorkloadsCsvData] = useState('');

  const [email, setEmail] = useState('')

  const totalConsumptionTarget = useMemo(() => {
    return dashboardData.consumptionBaseline + dashboardData.consumptionGrowthTarget
  }, [dashboardData.consumptionBaseline, dashboardData.consumptionGrowthTarget])

  useEffect(() => {
    const loadCsvData = async () => {
      try {
        const response = await fetch('/MonthlyConsumptionByAccount.csv')
        const data = await response.text()
        console.log('Fetched MonthlyConsumptionByAccount CSV data:', data)
        setCsvData(data)
      } catch (error) {
        console.error('Error loading MonthlyConsumptionByAccount CSV file:', error)
      }
    }

    const loadNeCsvData = async () => {
      try {
        const response = await fetch('/FY25NEOpen.csv')
        const data = await response.text()
        console.log('Fetched N/E CSV data:', data)
        setNeCsvData(data)
      } catch (error) {
        console.error('Error loading N/E CSV file:', error)
      }
    }

    const loadNbWorkloadsCsvData = async () => {
      try {
        const response = await fetch('/FY25ExistingCommitOpen.csv')
        const data = await response.text()
        console.log('Fetched FY25ExistingCommitOpen CSV data:', data.substring(0, 200) + '...') // Log first 200 characters
        setNbWorkloadsCsvData(data)
      } catch (error) {
        console.error('Error loading FY25ExistingCommitOpen CSV file: ', error)
      }
    }

    loadCsvData()
    loadNeCsvData()
    loadNbWorkloadsCsvData()
  }, [])

  const calculateTotal = (row: Record<string, number | string>) => {
    return Object.entries(row).reduce((acc, [key, value]) => {
      if (months.includes(key) && typeof value === 'number') {
        return acc + value
      }
      return acc
    }, 0)
  }

  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  const parseCurrencyInput = (value: string): number => {
    const numericValue = value.replace(/[^0-9.-]+/g, "")
    return parseFloat(numericValue) * 1000
  }

  const handleNeChange = (index: number, field: keyof Subscription, value: string) => {
    const newNeFromOsc = [...neFromOsc];
    newNeFromOsc[index] = {
      ...newNeFromOsc[index],
      [field]: value === '' ? undefined : parseCurrencyInput(value),
    };
    setNeFromOsc(newNeFromOsc);
  };

  // Commented out for future use
  // const _handleNonBookingChange = (index: number, field: keyof Subscription, value: string) => {
  //   // ... function implementation
  // };

  const handleDataChange = (field: keyof DashboardData, value: number | string) => {
    setDashboardData(prevData => ({
      ...prevData,
      [field]: value
    }));
    saveUserData({ ...dashboardData, [field]: value });
  };

  const saveUserData = debounce(async (data: DashboardData) => {
    try {
      const response = await fetch('/api/userData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }, 500);

  const handleClearData = async () => {
    try {
      const response = await fetch('/api/userData', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: dashboardData.territoryOwnerEmail }),
      });
      if (response.ok) {
        setDashboardData({
          territoryOwnerEmail: dashboardData.territoryOwnerEmail,
          neTarget: 0,
          consumptionBaseline: 0,
          consumptionGrowthTarget: 0,
        });
      } else {
        throw new Error('Failed to clear user data');
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const updateExistingSubscriptions = useCallback((email: string) => {
    if (!csvData) return;

    const parsedData = parseCsvData(csvData);
    console.log('Parsed MonthlyConsumptionByAccount CSV data:', parsedData);

    const filteredData = parsedData.filter(row => row['Territory Owner E-mail'] === email);
    console.log('Filtered MonthlyConsumptionByAccount data:', filteredData);

    const subscriptions = filteredData.reduce((acc: Subscription[], row) => {
      const customer = row['Customer Name'];
      const monthAbbr = row['Fiscal Month'].slice(5);
      const month = monthMap[monthAbbr as keyof typeof monthMap];
      const rawConsumption = row['Actual Consumption (k$)'];
      console.log(`Raw consumption for ${customer}, ${month}: ${rawConsumption}`);
      const consumption = rawConsumption ? parseFloat(rawConsumption) * 1000 : 0;
      console.log(`Parsed consumption for ${customer}, ${month}: ${consumption}`);

      let existingCustomer = acc.find(sub => sub.customer === customer);
      if (existingCustomer) {
        existingCustomer[month] = consumption;
        existingCustomer.total += consumption;
      } else {
        existingCustomer = {
          customer,
          june: undefined, july: undefined, august: undefined, september: undefined,
          october: undefined, november: undefined, december: undefined, january: undefined,
          february: undefined, march: undefined, april: undefined, may: undefined,
          total: 0,
          [month]: consumption
        };
        existingCustomer.total = consumption;
        acc.push(existingCustomer);
      }
      return acc;
    }, [] as Subscription[]);

    console.log('Final subscriptions:', subscriptions);
    setExistingSubscriptions(subscriptions);
  }, [csvData]);

  const updateNeFromOsc = useCallback((email: string) => {
    if (!neCsvData) return;

    const parsedData = Papa.parse<CSVRow>(neCsvData, { header: true }).data;
    console.log('Parsed N/E CSV data:', parsedData);

    const filteredData = parsedData.filter(row => row['Territory Owner E-mail'] === email);
    console.log('Filtered N/E data:', filteredData);

    const neData = filteredData.map(row => {
      const customer = row['Customer Name'];
      const neAmount = parseFloat(row['N/E']) * 1000;
      const closeDate = row['Date'];
      const probability = parseInt(row['Probability'], 10);

      return {
        customer,
        neAmount,
        closeDate,
        probability,
        june: 0, july: 0, august: 0, september: 0,
        october: 0, november: 0, december: 0, january: 0,
        february: 0, march: 0, april: 0, may: 0,
        total: 0
      };
    });

    console.log('Final N/E data:', neData);
    setNeFromOsc(neData);
  }, [neCsvData]);

  const updateNbWorkloads = useCallback((email: string) => {
    if (!nbWorkloadsCsvData) {
      console.log('No NB Workloads CSV data available');
      return;
    }

    const parsedData = Papa.parse<CSVRow>(nbWorkloadsCsvData, { header: true }).data;
    console.log('Parsed NB Workloads CSV data:', parsedData.slice(0, 2));

    const filteredData = parsedData.filter(row => row['Territory Owner E-mail'] === email);
    console.log('Filtered NB Workloads data:', filteredData.slice(0, 2));

    const nbWorkloadsData = filteredData.map(row => {
      const customer = row['Customer Name'];
      const wlAmount = parseFloat(row['Workload']) * 1000;
      const closeDate = row['Date'];
      const probability = parseInt(row['Probability'], 10);

      const subscription: Subscription = {
        customer,
        wlAmount,
        closeDate,
        probability,
        june: 0, july: 0, august: 0, september: 0,
        october: 0, november: 0, december: 0, january: 0,
        february: 0, march: 0, april: 0, may: 0,
        total: 0
      };

      return subscription;
    });

    console.log('Final NB Workloads data:', nbWorkloadsData.slice(0, 2));
    setNbWorkloads(nbWorkloadsData);
  }, [nbWorkloadsCsvData]);

  useEffect(() => {
    updateExistingSubscriptions(dashboardData.territoryOwnerEmail);
    updateNeFromOsc(dashboardData.territoryOwnerEmail);
    updateNbWorkloads(dashboardData.territoryOwnerEmail);
  }, [dashboardData.territoryOwnerEmail, updateExistingSubscriptions, updateNeFromOsc, updateNbWorkloads]);

  const calculateSectionTotal = (data: Subscription[]): { [key: string]: number } => {
    const total: { [key: string]: number } = { total: 0 };
    months.forEach(month => {
      total[month] = data.reduce((sum, row) => sum + (Number(row[month]) || 0), 0);
      total.total += total[month];
    });
    return total;
  };

  const tenanciesTotal = useMemo(() => calculateSectionTotal(existingSubscriptions), [existingSubscriptions]);
  const neTotal = useMemo(() => calculateSectionTotal(neFromOsc), [neFromOsc]);
  const nbWorkloadsTotal = useMemo(() => calculateSectionTotal(nbWorkloads), [nbWorkloads]);

  const totalConsumption = useMemo(() => {
    const result: { [key: string]: number | string } = { total: 0, customer: "Modeled Consumption Summary" };
    months.forEach(month => {
      result[month] = tenanciesTotal[month] + neTotal[month] + nbWorkloadsTotal[month];
      result.total = (result.total as number) + (result[month] as number);
    });
    return result;
  }, [tenanciesTotal, neTotal, nbWorkloadsTotal]);

  const totalConsumptionTargetRow = useMemo(() => {
    const monthlyTarget = totalConsumptionTarget / 12
    const result: { [key: string]: number | string } = { total: totalConsumptionTarget }
    result.customer = "Total Consumption Target"
    months.forEach(month => {
      result[month] = monthlyTarget
    })
    return result
  }, [totalConsumptionTarget]);
  
  //type _MonthlyData = Record<string, number>;

  const gapToGoal = useMemo<GapToGoal>(() => {
    const result: GapToGoal = {
      customer: "Gap to Goal",
      total: totalConsumptionTarget - Number(totalConsumption.total || 0),
      ...months.reduce((acc, month) => ({
        ...acc,
        [month]: Number((totalConsumptionTargetRow[month] || 0)) - Number((totalConsumption[month] || 0))
      }), {} as Record<string, number>)
    };
  
    return result;
  }, [totalConsumption, totalConsumptionTargetRow, totalConsumptionTarget]);


  const neTargetProgress = useMemo(() => {
    if (dashboardData.neTarget === 0) return 0;
    
    const totalNeAmount = neFromOsc.reduce((sum, row) => {
      // Only include rows where probability is >= 90
      if (row.probability && row.probability >= 90) {
        return sum + (row.neAmount || 0);
      }
      return sum;
    }, 0);
    
    return (totalNeAmount / dashboardData.neTarget) * 100;
  }, [neFromOsc, dashboardData.neTarget]);

  const consumptionProgress = useMemo(() => {
    if (dashboardData.consumptionGrowthTarget === 0) return 0;
    const consumptionGrowth = (totalConsumption.total as number) - dashboardData.consumptionBaseline;
    return (consumptionGrowth / dashboardData.consumptionGrowthTarget) * 100;
  }, [totalConsumption.total, dashboardData.consumptionBaseline, dashboardData.consumptionGrowthTarget]);

  const renderSubtotalRow = (total: { [key: string]: number }, label: string) => (
    <TableComponents.TableRow className="bg-gray-700">
      <TableComponents.TableCell className="font-bold text-gray-200">{label}</TableComponents.TableCell>
      {months.map(month => (
        <TableComponents.TableCell key={month} className="text-right text-gray-200">{formatMoney(total[month])}</TableComponents.TableCell>
      ))}
      <TableComponents.TableCell className="font-bold text-right text-gray-200">{formatMoney(total.total)}</TableComponents.TableCell>
    </TableComponents.TableRow>
  );

  const InputPopover = ({ value, onChange, label }: InputPopoverProps) => {
    const [inputValue, setInputValue] = useState(value !== undefined ? formatMoney(value).replace(/[kM]$/, '') : '')
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
            {value !== undefined ? formatMoney(value) : '-'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">{label}</h4>
              <p className="text-sm text-muted-foreground">
                Enter the new value (in dollars).
              </p>
            </div>
            <div className="grid gap-2">
              <Input
                ref={inputRef}
                id="value"
                value={inputValue}
                onChange={handleInputChange}
                className="bg-gray-700 text-gray-100"
              />
              <Button onClick={handleSubmit}>Save</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  console.log('First row data:', existingSubscriptions[0]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <header className="mb-8">
        <div className="flex items-center space-x-4">
          <Package2 size={32} />
          <h1 className="text-2xl font-bold">Territory Consumption Modeling</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-100">Territory Details</CardTitle>
            <CardDescription>Update your territory information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="territory-owner-email" className="text-sm font-medium text-gray-400">Territory Owner Email</Label>
                <Input 
                  id="territory-owner-email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-gray-700 text-gray-100 text-sm" 
                />
              </div>
              <Button onClick={() => handleDataChange('territoryOwnerEmail', email)} className="w-full">
                Update Territory
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-100">Targets & Baselines</CardTitle>
            <CardDescription>Set your financial goals and baselines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <EditableMoneyCell
                label="N/E Target"
                value={dashboardData.neTarget}
                onChange={(value: number) => handleDataChange('neTarget', value)}
                icon={<DollarSign size={16} />}
                tooltip="New and Expansion revenue target"
              />
              <EditableMoneyCell
                label="Consumption Baseline"
                value={dashboardData.consumptionBaseline}
                onChange={(value) => handleDataChange('consumptionBaseline', value)}
                icon={<BarChart3 size={16} />}
                tooltip="Starting point for consumption"
              />
              <EditableMoneyCell
                label="Consumption Growth Target"
                value={dashboardData.consumptionGrowthTarget}
                onChange={(value: number) => handleDataChange('consumptionGrowthTarget', value)}
                icon={<TrendingUp size={16} />}
                tooltip="Target for consumption growth"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-100">Progress Overview</CardTitle>
            <CardDescription>Track your performance against targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ProgressBar 
                value={neTargetProgress} 
                label="N/E Target Progress" 
                color="bg-blue-600" 
              />
              <ProgressBar 
                value={consumptionProgress} 
                label="Consumption Growth Progress" 
                color="bg-green-600" 
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Consumption Target</span>
                <span className="text-lg font-bold text-gray-200">{formatMoney(totalConsumptionTarget)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700 mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-100">Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <TableComponents.Table className="w-full table-fixed">
              <TableComponents.TableHeader>
                <TableComponents.TableRow>
                  <TableComponents.TableHead className="w-1/6 text-left text-gray-300 sticky left-0 bg-gray-800 z-40">Customer</TableComponents.TableHead>
                  {months.map((month) => (
                    <TableComponents.TableHead key={month} className="w-1/14 text-gray-300 text-right">{month.charAt(0).toUpperCase() + month.slice(1, 3)}</TableComponents.TableHead>
                  ))}
                  <TableComponents.TableHead className="w-1/6 text-gray-300 sticky right-0 bg-gray-800 z-40 text-right">Total</TableComponents.TableHead>
                </TableComponents.TableRow>
              </TableComponents.TableHeader>
              <TableComponents.TableBody>
                <TableComponents.TableRow>
                  <TableComponents.TableCell colSpan={14} className="font-bold text-sm text-gray-100 bg-gray-700">Tenancies</TableComponents.TableCell>
                </TableComponents.TableRow>
                {existingSubscriptions.map((subscription, index) => (
                  <TableComponents.TableRow key={index}>
                    <TableComponents.TableCell className="font-medium text-gray-200 sticky left-0 bg-gray-800 z-20">{subscription.customer}</TableComponents.TableCell>
                    {months.map((month) => (
                      <TableComponents.TableCell key={month} className="text-gray-300 text-right">
                        {formatMoney(subscription[month] as number)}
                      </TableComponents.TableCell>
                    ))}
                    <TableComponents.TableCell className="font-bold text-gray-100 sticky right-0 bg-gray-800 z-20 text-right">
                      {formatMoney(calculateTotal(subscription as Record<string, string | number>))}
                    </TableComponents.TableCell>
                  </TableComponents.TableRow>
                ))}
                {renderSubtotalRow(tenanciesTotal, "YTD Consumption")}

                <TableComponents.TableRow>
                  <TableComponents.TableCell colSpan={14} className="font-bold text-sm text-gray-100 bg-gray-700">N/E</TableComponents.TableCell>
                </TableComponents.TableRow>
                {neFromOsc.map((subscription, index) => (
                  <TableComponents.TableRow key={index}>
                    <TableComponents.TableCell className="font-medium text-gray-200 sticky left-0 bg-gray-800 z-20">
                      <div className="flex flex-col space-y-1">
                        <span>{subscription.customer}</span>
                        <div className="flex flex-col">
                          <Label htmlFor={`close-date-${index}`} className="text-xs font-medium text-gray-400">Close Date</Label>
                          <span id={`close-date-${index}`} className="text-xs text-gray-300">{subscription.closeDate}</span>
                        </div>
                        <div className="flex flex-col">
                          <Label htmlFor={`probability-${index}`} className="text-xs font-medium text-gray-400">Probability</Label>
                          <span id={`probability-${index}`} className="text-xs text-gray-300">{subscription.probability}%</span>
                        </div>
                        <div className="flex flex-col mt-2">
                          <Label htmlFor={`ne-amount-${index}`} className="text-xs font-medium text-gray-400">N/E Amount</Label>
                          <span id={`ne-amount-${index}`} className="text-xs text-gray-300">{formatMoney(Number(subscription.neAmount) || 0)}</span>
                        </div>
                      </div>
                    </TableComponents.TableCell>
                    {months.map((month) => (
                      <TableComponents.TableCell key={month} className="text-gray-300 p-0">
                      <InputPopover
                        value={(subscription as Subscription)[month] as number | undefined}
                        onChange={(value) => handleNeChange(index, month, value)}
                        label={`${subscription.customer} - ${month.charAt(0).toUpperCase() + month.slice(1)}`}
                      />
                    </TableComponents.TableCell>
                    ))}
                    <TableComponents.TableCell className="font-bold text-gray-100 sticky right-0 bg-gray-800 z-20 text-right">
                      {formatMoney(calculateTotal(subscription as Record<string, string | number>))}
                    </TableComponents.TableCell>
                  </TableComponents.TableRow>
                ))}
                {renderSubtotalRow(neTotal, "N/E Consumption")}

                <TableComponents.TableRow>
                  <TableComponents.TableCell colSpan={14} className="font-bold text-sm text-gray-100 bg-gray-700">NB Workloads</TableComponents.TableCell>
                </TableComponents.TableRow>
                {nbWorkloads.map((subscription, index) => (
                  <TableComponents.TableRow key={index}>
                    <TableComponents.TableCell className="font-medium text-gray-200 sticky left-0 bg-gray-800 z-20">
                      {subscription.customer}
                    </TableComponents.TableCell>
                    {months.map((month) => (
                      <TableComponents.TableCell key={month} className="text-gray-300 p-0">
                       <InputPopover
                          value={(subscription as Subscription)[month] as number | undefined}
                          onChange={(value) => handleNeChange(index, month, value)}
                          label={`${subscription.customer} - ${month.charAt(0).toUpperCase() + month.slice(1)}`}
                        />
                      </TableComponents.TableCell>
                    ))}
                    <TableComponents.TableCell className="font-bold text-gray-100 sticky right-0 bg-gray-800 z-20 text-right">{formatMoney(calculateTotal(subscription as Record<string, string | number>))}</TableComponents.TableCell>
                  </TableComponents.TableRow>
                ))}
                {renderSubtotalRow(nbWorkloadsTotal, "NB Workload Consumption")}

                <TableComponents.TableRow>
                  <TableComponents.TableCell colSpan={14} className="font-bold text-sm text-gray-100 bg-gray-700">Modeled Consumption Summary</TableComponents.TableCell>
                </TableComponents.TableRow>
                <TableComponents.TableRow className="bg-gray-600 font-bold">
                  <TableComponents.TableCell className="text-gray-100">Total Modeled Consumption</TableComponents.TableCell>
                  {months.map(month => (
                    <TableComponents.TableCell key={month} className="text-gray-100 text-right">{formatMoney(totalConsumption[month] as number)}</TableComponents.TableCell>
                  ))}
                  <TableComponents.TableCell className="text-gray-100 text-right">{formatMoney(totalConsumption.total as number)}</TableComponents.TableCell>
                </TableComponents.TableRow>
                <TableComponents.TableRow>
                  <TableComponents.TableCell className="font-medium text-gray-200 sticky left-0 bg-gray-800 z-20">
                    {totalConsumptionTargetRow.customer}
                  </TableComponents.TableCell>
                  {months.map((month) => (
                    <TableComponents.TableCell key={month} className="text-gray-300 font-bold text-right">
                      {formatMoney(totalConsumptionTargetRow[month] as number)}
                    </TableComponents.TableCell>
                  ))}
                  <TableComponents.TableCell className="font-bold text-gray-100 sticky right-0 bg-gray-800 z-20 text-right">
                    {formatMoney(totalConsumptionTargetRow.total as number)}
                  </TableComponents.TableCell>
                </TableComponents.TableRow>
                <TableComponents.TableRow className="bg-gray-700">
                  <TableComponents.TableCell className="font-medium text-gray-100 sticky left-0 bg-gray-700 z-20">
                                    {(gapToGoal as GapToGoal).customer}                  </TableComponents.TableCell>
                  {months.map((month) => (
                    <TableComponents.TableCell key={month} className="text-gray-100 font-bold text-right">
                      {formatMoney(Number((gapToGoal as GapToGoal)[month]) || 0)}
                    </TableComponents.TableCell>
                  ))}
                  <TableComponents.TableCell className="font-bold text-gray-100 sticky right-0 bg-gray-700 z-20 text-right">
                    {formatMoney(Number((gapToGoal as GapToGoal).total) || 0)}
                  </TableComponents.TableCell>
                </TableComponents.TableRow>
              </TableComponents.TableBody>
            </TableComponents.Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button onClick={handleClearData} className="bg-red-600 hover:bg-red-700">
          Clear Data
        </Button>
      </div>
    </div>
  )
}