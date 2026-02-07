import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors = {
  active: 'bg-green-900/50 text-green-300 border-green-700',
  idle: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  completed: 'bg-gray-700/50 text-gray-400 border-gray-600',
};

const typeColors = {
  coding: 'bg-blue-900/50 text-blue-300 border-blue-700',
  research: 'bg-purple-900/50 text-purple-300 border-purple-700',
  testing: 'bg-orange-900/50 text-orange-300 border-orange-700',
  chat: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  deployment: 'bg-pink-900/50 text-pink-300 border-pink-700',
  unknown: 'bg-gray-700/50 text-gray-400 border-gray-600',
};

function formatTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function SessionTable({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No active sessions found
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-gray-900/50">
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[120px]">Agent</TableHead>
            <TableHead>Repo</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead className="w-[80px]">PR</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[120px] text-right">Last Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow 
              key={session.id} 
              className="border-gray-800 hover:bg-gray-900/50"
            >
              <TableCell>
                <Badge className={typeColors[session.type] || typeColors.unknown}>
                  {session.type}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-gray-300">
                {session.agentId}
              </TableCell>
              <TableCell className="font-mono text-sm text-gray-400">
                {session.repo ? (
                  <span>
                    {session.repoOwner && (
                      <span className="text-gray-600">{session.repoOwner}/</span>
                    )}
                    {session.repo}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm text-gray-400">
                {session.branch || <span className="text-gray-600">—</span>}
              </TableCell>
              <TableCell>
                {session.pr ? (
                  session.pr.url ? (
                    <a
                      href={session.pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      #{session.pr.number}
                    </a>
                  ) : (
                    <span className="text-gray-400">#{session.pr.number}</span>
                  )
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[session.status] || statusColors.completed}>
                  {session.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm text-gray-500">
                {formatTimestamp(session.lastActive)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
