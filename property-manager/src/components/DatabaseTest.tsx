import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DatabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testDatabaseConnection();
  }, []);

  const testDatabaseConnection = async () => {
    try {
      setConnectionStatus('Connecting to database...');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation "properties" does not exist')) {
          setConnectionStatus('❌ Database connected but tables not found');
          setError('Tables do not exist. Need to create database schema.');
        } else {
          setConnectionStatus('❌ Database connection failed');
          setError(error.message);
        }
      } else {
        setConnectionStatus('✅ Database connected successfully');
        setTables(['properties']);
      }
    } catch (err) {
      setConnectionStatus('❌ Connection error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const createTestTable = async () => {
    try {
      setConnectionStatus('Creating test table...');
      
      // Try to create a simple test table
      const { data, error } = await supabase.rpc('create_test_table');
      
      if (error) {
        setError('Cannot create tables via RPC. Need to use Supabase dashboard or SQL editor.');
      } else {
        setConnectionStatus('✅ Test table created');
      }
    } catch (err) {
      setError('Cannot create tables. Please create them manually in Supabase dashboard.');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Database Connection Test</h2>
      
      <div className="mb-4">
        <p className="text-lg font-semibold">Status: {connectionStatus}</p>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {tables.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold">Found tables:</p>
          <ul className="list-disc list-inside">
            {tables.map(table => (
              <li key={table}>{table}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={testDatabaseConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Connection Again
        </button>
        
        <button
          onClick={createTestTable}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          Try Create Test Table
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <p className="font-semibold">Next Steps:</p>
        <ol className="list-decimal list-inside mt-2 text-sm">
          <li>If tables don&apos;t exist, you need to create them in Supabase dashboard</li>
          <li>Go to your Supabase project dashboard</li>
          <li>Navigate to SQL Editor</li>
          <li>Create the necessary tables (properties, tenants, etc.)</li>
        </ol>
      </div>
    </div>
  );
};

export default DatabaseTest;
