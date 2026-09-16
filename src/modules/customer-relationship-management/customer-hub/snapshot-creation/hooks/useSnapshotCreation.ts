import { useState, useEffect } from "react";
import { salesOrderProvider } from "../../create-sales-order/providers/fetchProvider";
import { Salesman, Customer, Supplier } from "../../create-sales-order/types";
import { toast } from "sonner";


export interface UploadFile {
    id: string;
    file: File;
    progress: number;
    file_id?: string;
    error?: string;
    status: 'pending' | 'uploading' | 'completed' | 'error';
}

export function useSnapshotCreation() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [isSalesman, setIsSalesman] = useState(true); // Default true until checked

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [customerSearch, setCustomerSearch] = useState("");

    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [poNo, setPoNo] = useState<string>("");
    const [uploads, setUploads] = useState<UploadFile[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [snapshots, setSnapshots] = useState<Record<string, unknown>[]>([]);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);

    const fetchSnapshots = async () => {
        setLoadingSnapshots(true);
        try {
            const res = await fetch(`/api/crm/customer-hub/snapshot-creation?t=${Date.now()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch");
            setSnapshots(data || []);
        } catch (error) {
            console.error("Failed to fetch snapshots:", error);
            toast.error("Failed to load snapshots.");
        } finally {
            setLoadingSnapshots(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();

        setLoadingSuppliers(true);
        salesOrderProvider.getSuppliers()
            .then(data => setSuppliers(data || []))
            .catch(console.error)
            .finally(() => setLoadingSuppliers(false));
            
        // Init context
        setIsInitializing(true);
        fetch(`/api/crm/customer-hub/snapshot-creation?action=init_context`)
            .then(res => res.json())
            .then(data => {
                if (data.isSalesman === false) {
                    setIsSalesman(false);
                } else {
                    setIsSalesman(true);
                    setSalesmen(data.salesmen || []);
                    setCustomers(data.customers || []);
                    if (data.salesmen && data.salesmen.length === 1) {
                        setSelectedSalesmanId(data.salesmen[0].id.toString());
                    }
                }
            })
            .catch(err => {
                console.error("Failed to init context:", err);
                toast.error("Failed to initialize user context.");
            })
            .finally(() => setIsInitializing(false));
    }, []);





    const handleFilesChange = (selectedFiles: FileList | File[] | null) => {
        if (!selectedFiles) return;
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : Array.from(selectedFiles);
        
        const newUploads: UploadFile[] = newFiles.map(f => ({
            id: Math.random().toString(36).substring(7) + Date.now(),
            file: f,
            progress: 0,
            status: 'pending'
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // Start upload for each
        newUploads.forEach(u => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress, status: 'uploading' } : item));
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success && response.file_id) {
                            setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress: 100, status: 'completed', file_id: response.file_id } : item));
                        } else {
                            setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress: 0, status: 'error', error: response.error || 'Upload failed' } : item));
                        }
                    } catch {
                        setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress: 0, status: 'error', error: 'Invalid response' } : item));
                    }
                } else {
                    setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress: 0, status: 'error', error: 'Server error' } : item));
                }
            });

            xhr.addEventListener("error", () => {
                setUploads(prev => prev.map(item => item.id === u.id ? { ...item, progress: 0, status: 'error', error: 'Network error' } : item));
            });

            const formData = new FormData();
            formData.append("file", u.file);

            xhr.open("POST", "/api/crm/customer-hub/snapshot-creation/upload");
            xhr.send(formData);
        });
    };

    const removeFile = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    const handlePoNoChange = (value: string) => {
        setPoNo(value);
    };

    const handleSubmit = async (): Promise<boolean> => {
        if (!selectedSalesmanId) {
            toast.error("Please select a salesman.");
            return false;
        }
        if (!selectedCustomerId) {
            toast.error("Please select a customer.");
            return false;
        }
        if (!poNo.trim()) {
            toast.error("Please enter a PO Number.");
            return false;
        }
        
        const completedUploads = uploads.filter(u => u.status === 'completed' && u.file_id);
        if (completedUploads.length === 0) {
            toast.error("Please wait for at least one snapshot to finish uploading.");
            return false;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("salesman_id", selectedSalesmanId);
            formData.append("customer_code", selectedCustomerId);
            formData.append("po_no", poNo);
            if (selectedSupplierId) {
                formData.append("supplier_id", selectedSupplierId);
            }
            
            const fileIds = completedUploads.map(u => u.file_id);
            const fileNames = completedUploads.map(u => u.file.name);
            formData.append("file_ids", JSON.stringify(fileIds));
            formData.append("file_names", JSON.stringify(fileNames));

            const res = await fetch("/api/crm/customer-hub/snapshot-creation", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create snapshot");
            }

            toast.success(`Snapshot created successfully. Order No: ${data.order_no}`);

            // Reset form
            setSelectedSalesmanId("");
            setSelectedCustomerId("");
            setSelectedSupplierId("");
            setPoNo("");
            setUploads([]);
            
            fetchSnapshots();
            
            return true;
        } catch (error: unknown) {
            console.error("Snapshot creation error:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred while uploading.";
            toast.error(errorMessage);
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        isInitializing,
        isSalesman,
        
        customers,
        selectedCustomerId,
        setSelectedCustomerId,
        customerSearch,
        setCustomerSearch,

        salesmen,
        selectedSalesmanId,
        setSelectedSalesmanId,

        suppliers,
        selectedSupplierId,
        setSelectedSupplierId,
        loadingSuppliers,

        poNo,
        handlePoNoChange,

        uploads,
        handleFilesChange,
        removeFile,

        submitting,
        handleSubmit,

        snapshots,
        loadingSnapshots,
        fetchSnapshots,
    };
}
