import { useEffect, useState, useMemo } from 'react';
import { SessionTable } from '@/components/SessionTable';
import { SessionFilters } from '@/components/SessionFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function App() {
  const [sessions, setSessions] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
  });

  useEffect(() => {
    // Fetch initial session data
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch sessions:', err);
        setLoading(false);
      });

    // WebSocket connection for live updates
    const ws = new WebSocket(`ws://${window.location.hostname}:3030`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('WebSocket message:', msg);
      
      if (msg.type === 'session:new') {
        setSessions(prev => [...prev, msg.session]);
      } else if (msg.type === 'session:update') {
        setSessions(prev => prev.map(s => 
          s.id === msg.sessionId ? { ...s, ...msg.changes } : s
        ));
      } else if (msg.type === 'session:deleted') {
        setSessions(prev => prev.filter(s => s.id !== msg.sessionId));
      }
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

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesRepo = session.repo?.toLowerCase().includes(search);
        const matchesBranch = session.branch?.toLowerCase().includes(search);
        const matchesAgent = session.agentId?.toLowerCase().includes(search);
        if (!matchesRepo && !matchesBranch && !matchesAgent) return false;
      }

      // Type filter
      if (filters.type !== 'all' && session.type !== filters.type) return false;

      // Status filter
      if (filters.status !== 'all' && session.status !== filters.status) return false;

      return true;
    });
  }, [sessions, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    coding: sessions.filter(s => s.type === 'coding').length,
    withPR: sessions.filter(s => s.pr).length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Mission Control</h1>
            <p className="text-gray-400">
              OpenClaw session dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {wsStatus === 'connected' ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-500">Total Sessions</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-500">Active</CardDescription>
              <CardTitle className="text-3xl text-green-400">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-500">Coding</CardDescription>
              <CardTitle className="text-3xl text-blue-400">{stats.coding}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-500">With PR</CardDescription>
              <CardTitle className="text-3xl text-purple-400">{stats.withPR}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading sessions...</div>
        ) : (
          <>
            <SessionFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              resultCount={filteredSessions.length}
            />
            <SessionTable sessions={filteredSessions} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
