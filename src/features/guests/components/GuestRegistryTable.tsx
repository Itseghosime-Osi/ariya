"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuestWithDetails } from "../types";
import { getGuestColumns } from "./GuestTableColumns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GuestRegistryTableProps {
  guests: GuestWithDetails[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onSelectGuest: (guest: GuestWithDetails) => void;
  onCopyLink: (guest: GuestWithDetails) => void;
  onShareWhatsApp: (guest: GuestWithDetails) => void;
}

export function GuestRegistryTable({
  guests,
  totalCount,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSelectGuest,
  onCopyLink,
  onShareWhatsApp,
}: GuestRegistryTableProps) {
  const columns = React.useMemo(
    () => getGuestColumns({ onSelectGuest, onCopyLink, onShareWhatsApp }),
    [onSelectGuest, onCopyLink, onShareWhatsApp]
  );

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize) || 1,
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-surface-container/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-on-surface-variant"
                >
                  Loading guests...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-surface-container/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-on-surface-variant"
                >
                  No guests found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-18 text-xs bg-surface-container-lowest"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2 text-on-surface-variant">
            Showing {startRow}-{endRow} of {totalCount} guests
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <span className="px-2 font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
