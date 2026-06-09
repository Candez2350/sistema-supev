const url = 'https://hzuyqztmszzngdcllbet.supabase.co/rest/v1/';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6dXlxenRtc3p6bmdkY2xsYmV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ0NDIyNiwiZXhwIjoyMDg1MDIwMjI2fQ.ryR25DSXIaKmWqB5M0WYvh0A_I2rpt5bhl1qDq_Z8yo';

async function run() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const rpcs = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log("RPCs:", rpcs);
}

run().catch(console.error);
