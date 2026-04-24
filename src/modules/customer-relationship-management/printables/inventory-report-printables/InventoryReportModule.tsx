"use client"

import React from "react"
import { useInventoryReport } from "./hooks/useInventoryReport"
import { InventoryReportMode } from "./types"
import { DataTable } from "@/components/ui/new-data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { LocalSearchableSelect } from "./components/LocalSearchableSelect"
import Barcode from "react-barcode"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Search, Package, Box, Hash, RefreshCcw, 
    LayoutGrid, Layers, MapPin, 
    Boxes, Eye, Download
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { InventoryReportPrintModal } from "./components/InventoryReportPrintModal"
import { GroupedInventoryItem, InventoryUnit } from "./types"

export const InventoryReportModule = ({ userName }: { userName?: string }) => {
    const { 
        data, loading, error, mode, setMode, search, setSearch, 
        selectedBranch, setSelectedBranch, selectedSupplier, setSelectedSupplier,
        branches, suppliers
    } = useInventoryReport()

    const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false)
    const [modalMode, setModalMode] = React.useState<'preview' | 'print'>('preview')

    const isFiltersSelected = selectedBranch !== "all" && selectedSupplier !== "all";

    const handleOpenModal = (mode: 'preview' | 'print') => {
        if (!isFiltersSelected) {
            toast.warning("Complete the selection", {
                description: "You must select a specific Branch and Supplier before viewing the report."
            });
            return;
        }
        setModalMode(mode);
        setIsPrintModalOpen(true);
    };

    // Calculate dynamic stats
    const uniqueProducts = React.useMemo(() => data.length, [data])
    const activeBranches = React.useMemo(() => new Set(data.map(i => i.branch)).size, [data])

    const columns = React.useMemo(() => {
        const baseColumns: ColumnDef<GroupedInventoryItem>[] = [
            {
                accessorKey: "supplier",
                header: "Supplier",
                cell: ({ row }) => <span className="font-semibold text-foreground/80">{row.getValue("supplier")}</span>
            },
            {
                accessorKey: "branch",
                header: "Branch",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-muted-foreground" />
                        <span className="text-sm">{row.getValue("branch")}</span>
                    </div>
                )
            },
            {
                accessorKey: "brand",
                header: "Brand",
                cell: ({ row }) => (
                    <div className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-black border border-primary/10 inline-block uppercase italic tracking-wider">
                        {row.getValue("brand")}
                    </div>
                )
            },
            {
                accessorKey: "category",
                header: "Category",
                cell: ({ row }) => <span className="text-muted-foreground text-xs uppercase font-medium">{row.getValue("category")}</span>
            },
            {
                accessorKey: "products",
                header: "Products",
                cell: ({ row }) => <span className="font-black text-foreground tracking-tight">{row.getValue("products")}</span>
            },
        ]

        if (mode === "Breakdown") {
            return [
                ...baseColumns,
                {
                    accessorKey: "units",
                    header: "Unit Details",
                    cell: ({ row }) => {
                        const units = row.original.units || [];
                        return (
                            <div className="divide-y divide-border/40 -my-2 -mx-4">
                                {units.map((u: InventoryUnit, i: number) => (
                                    <div key={i} className="flex flex-col px-4 py-3 hover:bg-primary/5 transition-colors h-[70px] justify-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-black text-foreground/90 uppercase tracking-tight">
                                                {u.unit}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold bg-muted/30 text-muted-foreground border-muted-foreground/20">
                                                x{u.unitCount}
                                            </Badge>
                                        </div>
                                        {u.barcode ? (
                                            <div className="mt-1.5 scale-[0.65] origin-left h-7 opacity-70 hover:opacity-100 transition-opacity">
                                                <Barcode 
                                                    value={u.barcode} 
                                                    height={25} 
                                                    width={1.2} 
                                                    fontSize={10} 
                                                    background="transparent"
                                                    margin={0}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-muted-foreground/50 uppercase font-black italic mt-1">No Barcode</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    }
                },
                {
                    id: "stockLevel",
                    header: () => <div className="text-right">Available Stock</div>,
                    cell: ({ row }) => {
                        const units = row.original.units || [];
                        return (
                            <div className="divide-y divide-border/40 -my-2 -mx-4">
                                {units.map((u: InventoryUnit, i: number) => (
                                    <div key={i} className="flex flex-col items-end px-4 py-3 hover:bg-primary/5 transition-colors h-[70px] justify-center text-right">
                                        <span className="font-black text-blue-600 text-lg leading-none tracking-tighter drop-shadow-sm">
                                            {Number(u.runningInventory).toLocaleString(undefined, { 
                                                minimumFractionDigits: u.runningInventory % 1 !== 0 ? 2 : 0, 
                                                maximumFractionDigits: 2 
                                            })}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-black uppercase mt-0.5 tracking-widest">{u.unit}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                },
            ]
        }

        if (mode === "Box") {
            return [
                ...baseColumns,
                {
                    accessorKey: "box",
                    id: "box",
                    header: () => <div className="text-right">Total Box</div>,
                    cell: ({ row }) => (
                        <div className="text-right flex flex-col items-end">
                            <span className="font-black text-2xl text-orange-600 tracking-tighter drop-shadow-sm">
                                {Number(row.getValue("box")).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-black text-orange-600/40 uppercase tracking-[0.2em]">Calculated Boxes</span>
                        </div>
                    )
                },
            ]
        }

        if (mode === "Piece") {
            return [
                ...baseColumns,
                {
                    accessorKey: "piece",
                    id: "piece",
                    header: () => <div className="text-right">Total Piece</div>,
                    cell: ({ row }) => (
                        <div className="text-right flex flex-col items-end">
                            <span className="font-black text-2xl text-emerald-600 tracking-tighter drop-shadow-sm">
                                {Number(row.getValue("piece")).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-emerald-600/40 uppercase tracking-[0.2em]">Total Units</span>
                        </div>
                    )
                },
            ]
        }

        return baseColumns
    }, [mode])

    if (error) {
        return (
            <Card className="border-destructive/20 bg-destructive/5 backdrop-blur-md rounded-3xl p-8">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                    <div className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 animate-pulse">
                        <RefreshCcw className="h-12 w-12 text-destructive" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-2xl font-black text-destructive tracking-tight italic uppercase">Error Loading Inventory</h3>
                        <p className="text-sm text-destructive/70 font-medium max-w-md">{error}</p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all duration-300"
                    >
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8 p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Premium Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner group transition-all duration-500 hover:scale-105">
                        <Boxes className="text-primary h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground/90 uppercase italic">
                            Inventory Report
                        </h1>
                        <div className="h-1.5 w-24 bg-primary rounded-full mt-1 bg-gradient-to-r from-primary to-primary/20" />
                    </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-4 w-full lg:w-auto">
                    {/* Unique Products Stat */}
                    <Card className="flex-1 md:flex-none p-0 overflow-hidden rounded-3xl border-border/50 bg-card/40 backdrop-blur-md shadow-lg ring-1 ring-border/50 min-w-[200px] group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 focus-within:ring-primary/40">
                        <CardContent className="p-5 relative">
                            <Package className="absolute top-2 right-2 h-16 w-16 text-primary/5 -rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
                            <div className="space-y-0.5 relative z-10">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                                    <div className="h-1 w-1 rounded-full bg-primary/40" /> Products
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-foreground/90 tracking-tighter">{uniqueProducts}</span>
                                    <Badge variant="outline" className="text-[9px] font-bold bg-green-500/5 text-green-600 border-green-500/20">UNIQUE</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Branches Stat */}
                    <Card className="flex-1 md:flex-none p-0 overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30 flex flex-col ring-2 ring-primary-foreground/20 min-w-[200px] group transition-all duration-500 hover:scale-[1.02] hover:shadow-primary/40">
                        <CardContent className="p-5 relative">
                            <MapPin className="absolute top-2 right-2 h-16 w-16 text-white/10 -rotate-12 transition-transform duration-700 group-hover:rotate-0" />
                            <div className="space-y-0.5 relative z-10">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary-foreground/60 flex items-center gap-1.5">
                                    <Building2 size={10} /> Branches
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-primary-foreground tracking-tighter">
                                        {activeBranches}
                                    </span>
                                    <span className="text-[8px] font-bold text-primary-foreground/60 tracking-widest uppercase">Monitored Segments</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Premium Filter Section */}
            <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 shadow-2xl transition-all duration-500 hover:shadow-primary/5">
                <div className="bg-background/80 backdrop-blur-2xl rounded-[calc(1.5rem-2px)] border p-4 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-end">
                        
                        {/* Mode Selection */}
                        <div className="space-y-2 lg:col-span-1 xl:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <Layers size={12} className="text-primary/60" /> Display Mode
                            </label>
                            <Tabs value={mode} onValueChange={(v) => setMode(v as InventoryReportMode)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-muted/40 p-1 rounded-xl h-11">
                                    <TabsTrigger value="Breakdown" className="rounded-lg text-[10px] font-black uppercase transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Package className="h-3 w-3 mr-1.5" />
                                        Breakdown
                                    </TabsTrigger>
                                    <TabsTrigger value="Box" className="rounded-lg text-[10px] font-black uppercase transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Box className="h-3 w-3 mr-1.5" />
                                        Box
                                    </TabsTrigger>
                                    <TabsTrigger value="Piece" className="rounded-lg text-[10px] font-black uppercase transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Hash className="h-3 w-3 mr-1.5" />
                                        Piece
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Branch Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <MapPin size={12} className="text-primary/60" /> Branch Location
                            </label>
                            <LocalSearchableSelect 
                                options={branches} 
                                value={selectedBranch} 
                                onValueChange={setSelectedBranch} 
                                placeholder="Select Branch..."
                                className={cn(
                                    "h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all duration-300",
                                    selectedBranch === "all" && "border-primary/30 bg-primary/5"
                                )}
                            />
                        </div>

                        {/* Supplier Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <LayoutGrid size={12} className="text-primary/60" /> Main Supplier
                            </label>
                            <LocalSearchableSelect 
                                options={suppliers} 
                                value={selectedSupplier} 
                                onValueChange={setSelectedSupplier} 
                                placeholder="Select Supplier..."
                                className={cn(
                                    "h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all duration-300",
                                    selectedSupplier === "all" && "border-primary/30 bg-primary/5"
                                )}
                            />
                        </div>

                        {/* Search Input */}
                        <div className="space-y-2 xl:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <Search size={12} className="text-primary/60" /> Quick Search
                            </label>
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11 text-sm bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => handleOpenModal('preview')}
                                className={cn(
                                    "flex-1 h-11 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest transition-all duration-300 shadow-sm",
                                    !isFiltersSelected && "opacity-50 grayscale cursor-not-allowed"
                                )}
                            >
                                <Eye size={14} className="mr-2" /> Preview
                            </Button>
                            <Button 
                                onClick={() => handleOpenModal('print')}
                                className={cn(
                                    "flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest transition-all duration-300 shadow-lg shadow-primary/20",
                                    !isFiltersSelected && "opacity-50 grayscale cursor-not-allowed"
                                )}
                            >
                                <Download size={14} className="mr-2" /> Download
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[4px] rounded-3xl border border-white/10 transition-all duration-500 py-20">
                        <div className="bg-card/90 backdrop-blur-2xl p-8 rounded-[2rem] shadow-2xl border flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                <RefreshCcw className="h-10 w-10 animate-spin text-primary relative z-10" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-black text-xl tracking-tight text-foreground/80">Synchronizing Inventory</span>
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Please wait...</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <Card className={cn(
                    "overflow-hidden rounded-3xl border-none shadow-2xl bg-card/50 backdrop-blur-md ring-1 ring-border/50 transition-all duration-500",
                    loading ? "opacity-20 scale-[0.99] blur-sm" : "opacity-100 scale-100 blur-0"
                )}>
                    <CardContent className="p-0">
                        <div className="p-1">
                            <DataTable 
                                columns={columns} 
                                data={data} 
                                isLoading={loading}
                                emptyTitle="No Records Found"
                                emptyDescription="Try adjusting your filters or search keywords."
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <InventoryReportPrintModal 
                isOpen={isPrintModalOpen}
                mode={modalMode}
                onClose={() => setIsPrintModalOpen(false)}
                data={data}
                filters={{
                    branch: selectedBranch,
                    supplier: selectedSupplier,
                    mode: mode
                }}
                userName={userName}
            />
        </div>
    )
}

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
}

function Building2({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}
