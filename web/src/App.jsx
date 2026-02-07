import { useEffect, useState } from 'react';

function App() {
  const [sessions, setSessions] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');

  useEffect(() => {
    // Fetch initial session data
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .catch((err) => console.error('Failed to fetch sessions:', err));

    // WebSocket connection for live updates
    const ws = new WebSocket(`ws://${window.location.hostname}:3030`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      // Handle session updates here
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('error');
    };

    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mission Control</h1>
        <p className="text-gray-400">
          OpenClaw session dashboard
          <span className="ml-4 text-sm">
            WS: <span className={wsStatus === 'connected' ? 'text-green-500' : 'text-red-500'}>
              {wsStatus}
            </span>
          </span>
        </p>
      </header>

      <main>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No active sessions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-semibold">Session</th>
                  <th className="text-left py-3 px-4 font-semibold">Agent</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Repo</th>
                  <th className="text-left py-3 px-4 font-semibold">Branch</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-800 hover:bg-gray-900">
                    <td className="py-3 px-4 font-mono text-sm">{session.id}</td>
                    <td className="py-3 px-4">{session.agent}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-blue-900/50 text-blue-300 text-xs">
                        {session.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{session.repo}</td>
                    <td className="py-3 px-4 font-mono text-sm">{session.branch}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-green-900/50 text-green-300 text-xs">
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {new Date(session.lastActive).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
