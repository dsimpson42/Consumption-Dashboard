import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'userData.json');

interface UserData {
  neTarget: number;
  consumptionBaseline: number;
  consumptionGrowthTarget: number;
}

interface DataStore {
  [email: string]: UserData;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const fileExists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
    if (!fileExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fileContent = await fs.readFile(DATA_FILE, 'utf8');
    const data: DataStore = JSON.parse(fileContent);
    const userData = data[email];

    if (userData) {
      return NextResponse.json(userData);
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error reading user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, neTarget, consumptionBaseline, consumptionGrowthTarget } = body as UserData & { email: string };

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    let data: DataStore = {};
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      data = JSON.parse(fileContent);
    } catch (readError) {
      console.log('No existing file or empty file, starting with empty data');
    }

    data[email] = { neTarget, consumptionBaseline, consumptionGrowthTarget };

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({ message: 'User data saved successfully' });
  } catch (error) {
    console.error('Error saving user data:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Internal server error', details: 'An unknown error occurred' }, { status: 500 });
    }
  }
}

export async function DELETE(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const fileExists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
    if (!fileExists) {
      return NextResponse.json({ error: 'No data to clear' }, { status: 404 });
    }

    const fileContent = await fs.readFile(DATA_FILE, 'utf8');
    let data = JSON.parse(fileContent);

    if (data[email]) {
      delete data[email];
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      return NextResponse.json({ message: 'User data cleared successfully' });
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error clearing user data:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Internal server error', details: 'An unknown error occurred' }, { status: 500 });
    }
  }
}