"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { UserPlus, Loader2, Hash, Building2, Settings2, ChevronsUpDown, Check, Search } from "lucide-react";
import { salesmanProvider } from "../../providers/fetchProvider";
import { Salesman, Branch, Division, Operation, User } from "../../types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateSalesmanModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateSalesmanModal({ open, onOpenChange, onSuccess }: CreateSalesmanModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [loadingSupportingData, setLoadingSupportingData] = useState(false);

    const [branches, setBranches] = useState<Branch[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [openEncoder, setOpenEncoder] = useState(false);
    const [openDivision, setOpenDivision] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);
    const [openOperation, setOpenOperation] = useState(false);
    const [openPriceType, setOpenPriceType] = useState(false);
    const [openInventoryDay, setOpenInventoryDay] = useState(false);

    const [newAgent, setNewAgent] = useState({
        salesman_name: "",
        salesman_code: "",
        employee_id: "",
        truck_plate: "",
        division_id: "",
        branch_code: "",
        operation: "",
        company_code: "",
        supplier_code: "",
        price_type: "",
        encoder_id: "",
        inventory_day: "",
        isActive: true,
        isInventory: false,
        canCollect: false,
    });

    const resetCreateForm = () => {
        setNewAgent({
            salesman_name: "", salesman_code: "", employee_id: "", truck_plate: "",
            division_id: "", branch_code: "", operation: "", company_code: "", supplier_code: "",
            price_type: "", encoder_id: "", inventory_day: "",
            isActive: true, isInventory: false, canCollect: false,
        });
    };

    useEffect(() => {
        if (open) {
            setLoadingSupportingData(true);
            salesmanProvider.getSupportingData()
                .then((data) => {
                    setBranches(data.branches);
                    setDivisions(data.divisions);
                    setOperations(data.operations);
                    setUsers(data.users);
                })
                .catch(() => toast.error("Failed to load form data"))
                .finally(() => setLoadingSupportingData(false));
        } else {
            resetCreateForm();
        }
    }, [open]);

    const handleCreateSalesman = async () => {
        if (!newAgent.salesman_name.trim()) return toast.error("Salesman name is required.");
        if (!newAgent.salesman_code.trim()) return toast.error("Salesman code is required.");
        if (!newAgent.employee_id) return toast.error("Employee ID is required.");

        setIsCreating(true);
        try {
            const payload: Partial<Salesman> = {
                salesman_name: newAgent.salesman_name.trim().toUpperCase(),
                salesman_code: newAgent.salesman_code.trim().toUpperCase(),
                employee_id: Number(newAgent.employee_id),
                isActive: newAgent.isActive ? 1 : 0,
                isInventory: newAgent.isInventory ? 1 : 0,
                canCollect: newAgent.canCollect ? 1 : 0,
            };

            if (newAgent.truck_plate.trim()) payload.truck_plate = newAgent.truck_plate.trim().toUpperCase();
            if (newAgent.division_id) payload.division_id = Number(newAgent.division_id);
            if (newAgent.branch_code) payload.branch_code = Number(newAgent.branch_code);
            if (newAgent.operation) payload.operation = Number(newAgent.operation);
            if (newAgent.company_code) payload.company_code = Number(newAgent.company_code);
            if (newAgent.supplier_code) payload.supplier_code = Number(newAgent.supplier_code);
            if (newAgent.price_type) payload.price_type = newAgent.price_type;
            if (newAgent.encoder_id) payload.encoder_id = Number(newAgent.encoder_id);
            if (newAgent.inventory_day) payload.inventory_day = Number(newAgent.inventory_day);

            const res = await salesmanProvider.createSalesman(payload);

            if (res.success) {
                toast.success(`Salesman ${newAgent.salesman_name.toUpperCase()} enlisted.`);
                onOpenChange(false);
                onSuccess();
            } else {
                toast.error(res.error || "Failed to create salesman.");
            }
        } catch {
            toast.error("Critical error during creation.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                <DialogHeader className="p-8 pb-6 border-b bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Enlist New Salesman</DialogTitle>
                            <DialogDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 leading-none">
                                Salesman Onboarding Protocol
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {loadingSupportingData ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initializing onboarding form...</span>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-8 space-y-8">
                            {/* Identity Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Identity</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Salesman Name <span className="text-red-400">*</span></Label>
                                        <Input
                                            placeholder="Full name of the salesman"
                                            className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                            value={newAgent.salesman_name}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, salesman_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Salesman Code <span className="text-red-400">*</span></Label>
                                        <Input
                                            placeholder="e.g. SM001"
                                            className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                            value={newAgent.salesman_code}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, salesman_code: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Employee ID <span className="text-red-400">*</span></Label>
                                        <Input
                                            type="number"
                                            placeholder="Numeric ID"
                                            className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                            value={newAgent.employee_id}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, employee_id: e.target.value }))}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Encoder / Linked User</Label>
                                        <Popover open={openEncoder} onOpenChange={setOpenEncoder} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.encoder_id && "text-muted-foreground")}>
                            {newAgent.encoder_id ? users.find(u => u.user_id.toString() === newAgent.encoder_id)?.user_fname + " " + users.find(u => u.user_id.toString() === newAgent.encoder_id)?.user_lname : "Select linked user (optional)"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search users..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No user found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {users.map((u) => (
                                                                <CommandItem key={u.user_id} value={`${u.user_fname} ${u.user_lname}`} onSelect={() => { setNewAgent(prev => ({ ...prev, encoder_id: u.user_id.toString() })); setOpenEncoder(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.encoder_id === u.user_id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    {u.user_fname} {u.user_lname} — {u.user_position}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Assignment Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Assignment</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Division</Label>
                                        <Popover open={openDivision} onOpenChange={setOpenDivision} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.division_id && "text-muted-foreground")}>
                            {newAgent.division_id ? divisions.find(d => d.division_id.toString() === newAgent.division_id)?.division_name : "Select division"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search divisions..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No division found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {divisions.map((d) => (
                                                                <CommandItem key={d.division_id} value={d.division_name} onSelect={() => { setNewAgent(prev => ({ ...prev, division_id: d.division_id.toString() })); setOpenDivision(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.division_id === d.division_id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    {d.division_name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Branch</Label>
                                        <Popover open={openBranch} onOpenChange={setOpenBranch} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.branch_code && "text-muted-foreground")}>
                            {newAgent.branch_code ? branches.find(b => b.id.toString() === newAgent.branch_code)?.branch_name : "Select branch"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search branches..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No branch found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {branches.map((b) => (
                                                                <CommandItem key={b.id} value={b.branch_name} onSelect={() => { setNewAgent(prev => ({ ...prev, branch_code: b.id.toString() })); setOpenBranch(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.branch_code === b.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    {b.branch_name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Operation</Label>
                                        <Popover open={openOperation} onOpenChange={setOpenOperation} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.operation && "text-muted-foreground")}>
                            {newAgent.operation ? operations.find(o => o.id.toString() === newAgent.operation)?.operation_name : "Select operation"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search operations..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No operation found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {operations.map((o) => (
                                                                <CommandItem key={o.id} value={o.operation_name || ""} onSelect={() => { setNewAgent(prev => ({ ...prev, operation: o.id.toString() })); setOpenOperation(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.operation === o.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    {o.operation_name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Price Type</Label>
                                        <Popover open={openPriceType} onOpenChange={setOpenPriceType} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.price_type && "text-muted-foreground")}>
                            {newAgent.price_type ? `Price ${newAgent.price_type}` : "Select pricing"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search pricing..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No match.</CommandEmpty>
                                                        <CommandGroup>
                                                            {["A", "B", "C", "D", "E"].map((p) => (
                                                                <CommandItem key={p} value={`Price ${p}`} onSelect={() => { setNewAgent(prev => ({ ...prev, price_type: p })); setOpenPriceType(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.price_type === p ? "opacity-100" : "opacity-0")} />
                                                                    Price {p}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Company Code</Label>
                                        <Input
                                            type="number"
                                            placeholder="Optional"
                                            className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                            value={newAgent.company_code}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, company_code: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Supplier Code</Label>
                                        <Input
                                            type="number"
                                            placeholder="Optional"
                                            className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                            value={newAgent.supplier_code}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, supplier_code: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Logistics Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Logistics & Capabilities</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Truck Plate</Label>
                                        <Input
                                            placeholder="e.g. ABC-1234"
                                            className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                            value={newAgent.truck_plate}
                                            onChange={(e) => setNewAgent(prev => ({ ...prev, truck_plate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Inventory Day</Label>
                                        <Popover open={openInventoryDay} onOpenChange={setOpenInventoryDay} modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                          <span className={cn("truncate", !newAgent.inventory_day && "text-muted-foreground")}>
                            {newAgent.inventory_day ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][Number(newAgent.inventory_day) - 1] : "Select day"}
                          </span>
                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                        <CommandInput placeholder="Search day..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                    </div>
                                                    <CommandList className="max-h-[200px]">
                                                        <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No match.</CommandEmpty>
                                                        <CommandGroup>
                                                            {[{ v: "1", l: "Monday" }, { v: "2", l: "Tuesday" }, { v: "3", l: "Wednesday" }, { v: "4", l: "Thursday" }, { v: "5", l: "Friday" }, { v: "6", l: "Saturday" }, { v: "7", l: "Sunday" }].map((d) => (
                                                                <CommandItem key={d.v} value={d.l} onSelect={() => { setNewAgent(prev => ({ ...prev, inventory_day: d.v })); setOpenInventoryDay(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                    <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.inventory_day === d.v ? "opacity-100" : "opacity-0")} />
                                                                    {d.l}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 pt-2">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Active Status</Label>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can take orders and be assigned customers</p>
                                        </div>
                                        <Switch checked={newAgent.isActive} onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, isActive: checked }))} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Inventory Access</Label>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can manage truck inventory</p>
                                        </div>
                                        <Switch checked={newAgent.isInventory} onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, isInventory: checked }))} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Collection Rights</Label>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can collect payments from customers</p>
                                        </div>
                                        <Switch checked={newAgent.canCollect} onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, canCollect: checked }))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="p-8 pt-0 flex gap-3 border-t bg-slate-50/30">
                    <div className="flex gap-3 w-full pt-6">
                        <Button
                            variant="ghost"
                            className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                            onClick={() => onOpenChange(false)}
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-[2] font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-2xl bg-primary hover:bg-primary/90 disabled:opacity-20 transition-all"
                            onClick={handleCreateSalesman}
                            disabled={isCreating || loadingSupportingData}
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            {isCreating ? "ENLISTING SALESMAN..." : "CONFIRM ENLISTMENT"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}