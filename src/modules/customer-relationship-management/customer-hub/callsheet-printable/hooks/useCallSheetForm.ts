import { useState, useEffect } from "react";
import {
    getSalesmen,
    getAccounts,
    getCustomers,
    getSuppliers,
    getProducts,
    getMonthlyAverage
} from "../providers/fetchProvider";

export interface Salesman {
    user_id: number;
    user_fname: string;
    user_lname: string;
}

export interface Account {
    id: number;
    salesman_name: string;
    salesman_code: string;
    price_type?: string;
}

export interface Customer {
    id: number;
    customer_name: string;
    customer_code: string;
}

export interface Supplier {
    id: number;
    supplier_name: string;
    supplier_type?: string;
}

export interface Product {
    product_id: number;
    display_name: string;
    product_name?: string;
    description?: string;
    parent_id?: number;
}

export function useCallSheetForm() {
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [moAvgData, setMoAvgData] = useState<Record<number, number>>({});

    useEffect(() => {
        const fetchInitialSalesmen = async () => {
            try {
                const data = await getSalesmen();
                setSalesmen(data);
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
                const data = await getAccounts(salesman.user_id);
                setAccounts(data);
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
                const data = await getCustomers(account.id);
                setCustomers(data);
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
                const [suppliersData, moAvg] = await Promise.all([
                    getSuppliers(),
                    getMonthlyAverage(customer.customer_code)
                ]);
                setSuppliers(suppliersData);
                setMoAvgData(moAvg);
            } catch (e) {
                console.error("Failed to fetch customer data:", e);
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
                const data = await getProducts(supplier.id);
                setProducts(data);
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
        moAvgData,
        handleSalesmanChange,
        handleAccountChange,
        handleCustomerChange,
        handleSupplierChange
    };
}
