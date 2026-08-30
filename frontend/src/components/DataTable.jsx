import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2, Search } from 'lucide-react';
import './DataTable.css';
import Button from './Button';

export default function DataTable({ 
  data = [], 
  columns = [], 
  searchKeys = [], 
  searchPlaceholder = 'Tìm kiếm...',
  toolbarActions = null,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  renderExpandedRow,
  expandedRowId,
  onExpandedRowChange
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState({ key: null, direction: 'asc' });
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const currentRowSelection = rowSelection || internalRowSelection;
  const updateRowSelection = onRowSelectionChange || setInternalRowSelection;

  const [columnVisibility, setColumnVisibility] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.accessorKey]: true }), {})
  );
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter Data
  const filteredData = useMemo(() => {
    if (!globalFilter || searchKeys.length === 0) return data;
    const lowerFilter = globalFilter.toLowerCase();
    return data.filter(item => {
      return searchKeys.some(key => {
        const val = item[key];
        return typeof val === 'string' && val.toLowerCase().includes(lowerFilter);
      });
    });
  }, [data, globalFilter, searchKeys]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sorting.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sorting.key];
      const valB = b[sorting.key];
      
      if (valA < valB) return sorting.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sorting.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sorting]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage]);

  const toggleSort = (key) => {
    if (sorting.key === key) {
      if (sorting.direction === 'asc') setSorting({ key, direction: 'desc' });
      else setSorting({ key: null, direction: 'asc' });
    } else {
      setSorting({ key, direction: 'asc' });
    }
  };

  const visibleColumns = columns.filter(col => columnVisibility[col.accessorKey] !== false);
  const isAllSelected = paginatedData.length > 0 && paginatedData.every((_, idx) => currentRowSelection[(currentPage - 1) * rowsPerPage + idx]);

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    const newSelection = { ...currentRowSelection };
    paginatedData.forEach((_, idx) => {
      newSelection[(currentPage - 1) * rowsPerPage + idx] = checked;
    });
    updateRowSelection(newSelection);
  };

  const handleSelectRow = (idx, checked) => {
    updateRowSelection(prev => ({
      ...prev,
      [(currentPage - 1) * rowsPerPage + idx]: checked
    }));
  };

  const selectedCount = Object.values(currentRowSelection).filter(Boolean).length;

  return (
    <div className="data-table-wrapper">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          {searchKeys.length > 0 && (
            <div className="data-table-search">
              <Search size={16} className="text-muted" style={{ minWidth: '16px' }} />
              <input 
                type="text" 
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="data-table-input"
              />
            </div>
          )}
          {toolbarActions}
        </div>
      </div>

      {/* Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {visibleColumns.map(col => (
                <th key={col.accessorKey} style={{ textAlign: col.align || 'left', width: col.width }}>
                  {col.sortable ? (
                    <div style={{ display: 'flex', justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start') }}>
                      <button 
                        className="data-table-sort-btn"
                        onClick={() => toggleSort(col.accessorKey)}
                      >
                        {col.header}
                        {sorting.key === col.accessorKey ? (
                          sorting.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} className="text-muted opacity-50 hover:opacity-100" />
                        )}
                      </button>
                    </div>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="text-center py-12 text-muted" style={{ color: 'var(--text-muted)' }}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = row.id || index;
                const isSelected = currentRowSelection[rowId] || false;
                const isExpanded = expandedRowId === rowId;
                return (
                  <React.Fragment key={rowId}>
                    <tr 
                      className={`hover:bg-[rgba(255,255,255,0.02)] transition-colors ${isSelected || isExpanded ? 'selected-row' : ''}`}
                      onClick={() => {
                        if (onRowClick) onRowClick(row);
                        if (onExpandedRowChange) onExpandedRowChange(isExpanded ? null : rowId);
                      }}
                      style={{ cursor: (onRowClick || onExpandedRowChange) ? 'pointer' : 'default' }}
                    >
                      {visibleColumns.map(col => (
                        <td key={col.accessorKey} style={{ textAlign: col.align || 'left' }}>
                          {col.cell ? col.cell(row) : row[col.accessorKey]}
                        </td>
                      ))}
                    </tr>
                    {renderExpandedRow && isExpanded && (
                      <tr>
                        <td colSpan={visibleColumns.length}>
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      <div className="data-table-footer" style={{ justifyContent: 'flex-end' }}>
        <div className="data-table-pagination">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Trang {currentPage} của {totalPages || 1}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button 
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Button 
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Tiếp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
