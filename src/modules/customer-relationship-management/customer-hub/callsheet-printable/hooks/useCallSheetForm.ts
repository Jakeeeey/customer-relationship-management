import { useState, useEffect } from "react";

export function useCallSheetForm() {
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [selectedSalesman, setSelectedSalesman] = useState<any | null>(null);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        const fetchInitialSalesmen = async () => {
            try {
                const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=salesmen`);
                const json = await res.json();
                setSalesmen(json.data || []);
            } catch (error) {
                console.error("Failed to fetch salesmen:", error);
            }
        };
        fetchInitialSalesmen();
    }, []);

    const handleSalesmanChange = async (val: string) => {
        const salesman = salesmen.find(s => s.user_id?.toString() === val);
        setSelectedSalesman(salesman || null);
        setSelectedAccount(null);
        setSelectedCustomer(null);
        setSelectedSupplier(null);
        setAccounts([]);
        setCustomers([]);
        setSuppliers([]);
        setProducts([]);

        if (salesman) {
            setLoadingAccounts(true);
            try {
                const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=accounts&userId=${salesman.user_id}`);
                const json = await res.json();
                setAccounts(json.data || []);
            } catch (e) {
                console.error(e);
            }
            setLoadingAccounts(false);
        }
    };

    const handleAccountChange = async (val: string) => {
        const account = accounts.find(a => a.id.toString() === val);
        setSelectedAccount(account || null);
        setSelectedCustomer(null);
        setSelectedSupplier(null);
        setCustomers([]);
        setSuppliers([]);
        setProducts([]);

        if (account) {
            setLoadingCustomers(true);
            try {
                const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=customers&salesmanId=${account.id}`);
                const json = await res.json();
                setCustomers(json.data || []);
            } catch (e) {
                console.error(e);
            }
            setLoadingCustomers(false);
        }
    };

    const handleCustomerChange = async (val: string) => {
        const customer = customers.find(c => c.id.toString() === val);
        setSelectedCustomer(customer || null);
        setSelectedSupplier(null);
        setProducts([]);

        if (customer) {
            setLoadingSuppliers(true);
            try {
                const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=suppliers`);
                const json = await res.json();
                setSuppliers(json.data || []);
            } catch (e) {
                console.error(e);
            }
            setLoadingSuppliers(false);
        }
    };

    const handleSupplierChange = async (val: string) => {
        const supplier = suppliers.find(s => s.id.toString() === val);
        setSelectedSupplier(supplier || null);
        setProducts([]);

        if (supplier) {
            setLoadingProducts(true);
            try {
                const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=products&supplierId=${supplier.id}`);
                const json = await res.json();
                setProducts(json.data || []);
            } catch (e) {
                console.error(e);
            }
            setLoadingProducts(false);
        }
    };

    return {
        salesmen,
        selectedSalesman,
        accounts,
        selectedAccount,
        loadingAccounts,
        customers,
        selectedCustomer,
        loadingCustomers,
        suppliers,
        selectedSupplier,
        loadingSuppliers,
        products,
        loadingProducts,
        handleSalesmanChange,
        handleAccountChange,
        handleCustomerChange,
        handleSupplierChange
    };
}
