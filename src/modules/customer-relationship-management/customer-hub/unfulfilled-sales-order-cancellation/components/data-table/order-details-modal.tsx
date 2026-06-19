import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesOrder, InvoiceDetailsGroup } from "../../types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderDetailsModalProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelOrder: (order: SalesOrder, remarks: string) => void;
}

export function OrderDetailsModal({ order, isOpen, onClose, onCancelOrder }: OrderDetailsModalProps) {
  const [detailsGroups, setDetailsGroups] = useState<InvoiceDetailsGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>("");

  useEffect(() => {
    if (isOpen && order) {
      const timer = setTimeout(() => {
        setIsLoading(true);
        setError(null);
        setDetailsGroups([]);
        setRemarks("");
      }, 0);

      fetch(`/api/crm/customer-hub/unfulfilled-sales-order-cancellation/${encodeURIComponent(order.order_no)}/details`)
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to fetch details");
          }
          return res.json();
        })
        .then((data) => {
          setDetailsGroups(data);
        })
        .catch((err) => {
          console.error("Failed to fetch order details:", err);
          setError(err.message || "An error occurred");
        })
        .finally(() => {
          setIsLoading(false);
        });

      return () => clearTimeout(timer);
    }
  }, [isOpen, order]);

  if (!order) return null;

  const customerName = order.customer_code && typeof order.customer_code === "object" 
    ? order.customer_code.customer_name 
    : String(order.customer_code || "-");
  
  const salesmanObj = order.salesman_id && typeof order.salesman_id === "object" ? order.salesman_id : null;
  const salesmanDisplay = salesmanObj 
    ? `${salesmanObj.name}${salesmanObj.code ? ` (${salesmanObj.code})` : ""}`
    : String(order.salesman_id || "-");

  const supplierDisplay = order.supplier_id && typeof order.supplier_id === "object" ? order.supplier_id.name : String(order.supplier_id || "-");
  const branchDisplay = order.branch_id && typeof order.branch_id === "object" ? order.branch_id.name : String(order.branch_id || "-");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col rounded-2xl gap-0 p-0 overflow-hidden bg-card">
        
        {/* Header Section */}
        <DialogHeader className="p-4 pb-4 border-b bg-muted/10 shrink-0">
          <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2 mb-3">
            Order Details
            <Badge variant="outline" className="font-mono text-xs bg-background shadow-sm px-2 py-0.5 rounded border-primary/20 text-primary">
              {order.order_no}
            </Badge>
          </DialogTitle>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">SO #</span>
              <span className="font-semibold text-sm">{order.order_no || "-"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">PO #</span>
              <span className="font-semibold text-sm">{order.po_no || "-"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Order Date</span>
              <span className="font-semibold text-sm">{order.order_date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(order.order_date)) : "-"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Branch</span>
              <span className="font-semibold text-sm">{branchDisplay}</span>
            </div>
            <div className="flex flex-col gap-0.5 md:col-span-2">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Customer Name</span>
              <span className="font-semibold text-sm text-primary">{customerName || "-"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Salesman</span>
              <span className="font-semibold text-sm">{salesmanDisplay}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Supplier</span>
              <span className="font-semibold text-sm">{supplierDisplay}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-2 text-destructive">
                <p className="font-semibold text-sm">Error Loading Details</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            ) : detailsGroups.length === 0 ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                <p className="font-medium text-lg">No Invoices Found</p>
                <p className="text-sm">This order does not have any generated invoices yet.</p>
              </div>
            ) : (
              <Tabs defaultValue={detailsGroups[0]?.invoice_no} className="flex-1 flex flex-col min-h-0">
                {detailsGroups.length > 0 && (
                  <div className="px-4 pt-3 pb-0 shrink-0">
                    <div className="w-full overflow-x-auto pb-2 scrollbar-none">
                      <TabsList className="bg-transparent !h-auto p-0 gap-1 flex w-max border-b border-muted/50 rounded-none shrink-0 pb-1">
                        {detailsGroups.map(group => (
                          <TabsTrigger 
                            key={group.invoice_no} 
                            value={group.invoice_no}
                            className="h-auto relative rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent transition-colors focus-visible:ring-0"
                          >
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                {group.invoice_no}
                              </span>
                              {group.transaction_status && group.transaction_status !== "Unknown Status" && (
                                <span 
                                  className={`text-[10px] leading-tight px-2.5 py-0.5 rounded-full border whitespace-nowrap text-center font-semibold tracking-wide ${
                                    group.transaction_status === "Paid" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                                    group.transaction_status === "Unpaid" || group.transaction_status === "Pending" ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" :
                                    "bg-muted text-muted-foreground border-border"
                                  }`}
                                  title={group.transaction_status}
                                >
                                  {group.transaction_status}
                                </span>
                              )}
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </div>
                )}

                {detailsGroups.map((group) => {
                  const grandTotal = group.details.reduce((sum, item) => sum + item.net_amount, 0);
                  
                  return (
                    <TabsContent key={group.invoice_no} value={group.invoice_no} className="m-0 focus-visible:ring-0 flex-1 flex flex-col min-h-0 p-4 pt-3">
                      <div className="border rounded-xl shadow-sm bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="shrink-0 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-2.5 grid grid-cols-12 gap-3 border-b shadow-sm z-10">
                          <div className="col-span-3">Product</div>
                          <div className="col-span-1 text-center">UOM</div>
                          <div className="col-span-1 text-right">Qty</div>
                          <div className="col-span-2 text-right">Unit Price</div>
                          <div className="col-span-2 text-right">Gross Total</div>
                          <div className="col-span-1 text-right">Discount</div>
                          <div className="col-span-2 text-right">Net Amount</div>
                        </div>
                        
                        <ScrollArea className="flex-1 overflow-auto min-h-[100px]">
                          <div className="flex flex-col">
                            {group.details.map((item) => (
                              <div key={item.detail_id} className="px-4 py-2 grid grid-cols-12 gap-3 border-b border-muted/50 last:border-0 hover:bg-muted/20 transition-colors items-center text-xs">
                                <div className="col-span-3 flex flex-col gap-0.5 pr-2">
                                  <span className="font-semibold leading-tight line-clamp-2" title={item.product_name}>
                                    {item.product_name}
                                  </span>
                                  {item.product_code && (
                                    <span className="font-mono text-[10px] text-muted-foreground">{item.product_code}</span>
                                  )}
                                </div>
                                <div className="col-span-1 text-center font-medium text-muted-foreground">
                                  {item.unit || "-"}
                                </div>
                                <div className="col-span-1 text-right font-semibold">
                                  {item.ordered_quantity}
                                </div>
                                <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                                  ₱{item.unit_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="col-span-2 text-right tabular-nums">
                                  ₱{item.gross_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="col-span-1 text-right text-destructive tabular-nums">
                                  {item.discount_amount > 0 ? `-₱${item.discount_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                                </div>
                                <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">
                                  ₱{item.net_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        
                        <div className="shrink-0 bg-muted/10 px-4 py-3 border-t flex items-center justify-end gap-6 z-10">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grand Total</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-500 tabular-nums">
                            ₱{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
        </div>

        {/* Footer Section */}
        <DialogFooter className="p-4 border-t flex flex-row items-center justify-between gap-4 bg-muted/10 shrink-0">
          <div className="flex-1">
            <Input
              placeholder="Enter cancellation remarks (required)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-10 rounded-xl border-primary/20 focus-visible:ring-primary/40 bg-background font-medium text-xs placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl font-medium px-6 h-10" onClick={onClose}>
              Close
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700 shadow-sm active:scale-95 transition-transform px-6 h-10" 
              onClick={() => {
                if (!remarks.trim()) {
                  toast.error("Remarks is required to cancel this order", {
                    duration: 4000,
                  });
                  return;
                }
                onCancelOrder(order, remarks);
              }}
            >
              Cancel Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
