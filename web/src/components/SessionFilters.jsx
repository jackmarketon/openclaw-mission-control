import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SessionFilters({ filters, onFilterChange, resultCount }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search sessions... (repo, branch, agent)"
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="bg-gray-900 border-gray-800"
        />
      </div>
      
      <Select
        value={filters.type}
        onValueChange={(value) => onFilterChange({ type: value })}
      >
        <SelectTrigger className="w-[160px] bg-gray-900 border-gray-800">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="coding">Coding</SelectItem>
          <SelectItem value="research">Research</SelectItem>
          <SelectItem value="testing">Testing</SelectItem>
          <SelectItem value="chat">Chat</SelectItem>
          <SelectItem value="deployment">Deployment</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => onFilterChange({ status: value })}
      >
        <SelectTrigger className="w-[160px] bg-gray-900 border-gray-800">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="idle">Idle</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {(filters.search || filters.type !== 'all' || filters.status !== 'all') && (
        <button
          onClick={() => onFilterChange({ search: '', type: 'all', status: 'all' })}
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          Clear filters
        </button>
      )}

      <div className="text-sm text-gray-500">
        {resultCount} session{resultCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
