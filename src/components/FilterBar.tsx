import React from 'react';
import { RiskLevel } from '../types';
import { Filter, X } from 'lucide-react';

interface FilterBarProps {
  riskFilter: RiskLevel | null;
  setRiskFilter: (risk: RiskLevel | null) => void;
  totalPests: number;
  filteredCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  riskFilter, 
  setRiskFilter, 
  totalPests,
  filteredCount
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center space-x-1">
        <Filter size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Risk Level:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRiskFilter(null)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            riskFilter === null 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({totalPests})
        </button>
        
        <button
          onClick={() => setRiskFilter('low')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            riskFilter === 'low'
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          Low
        </button>
        
        <button
          onClick={() => setRiskFilter('moderate')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            riskFilter === 'moderate'
              ? 'bg-yellow-500 text-white' 
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          Moderate
        </button>
        
        <button
          onClick={() => setRiskFilter('high')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            riskFilter === 'high'
              ? 'bg-red-600 text-white' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          High
        </button>
      </div>
      
      {riskFilter && (
        <div className="flex items-center">
          <span className="text-sm text-gray-500">
            Showing {filteredCount} of {totalPests} pests
          </span>
          <button 
            onClick={() => setRiskFilter(null)}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Clear filter"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;