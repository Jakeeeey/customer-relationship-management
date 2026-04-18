import React from 'react';
import { DocumentViewerClient } from './_components/DocumentViewerClient';

export const dynamic = "force-dynamic";

export default async function DocumentViewerPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await props.searchParams;
    const salesOrderId = params.sales_order_id as string | undefined;
    const salesOrderNo = params.sales_order_no as string | undefined;
    const attachmentId = params.attachment_id as string | undefined;

    let attachmentsList: { name: string; url: string }[] = [];

    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    try {
        const filterOptions: Record<string, unknown> = {};
        
        if (salesOrderId) filterOptions.sales_order_id = { _eq: salesOrderId };
        else if (salesOrderNo) filterOptions.sales_order_no = { _eq: salesOrderNo };
        else if (attachmentId) filterOptions.id = { _eq: attachmentId };

        if (Object.keys(filterOptions).length > 0) {
            const filterValues = JSON.stringify(filterOptions);
            const res = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?filter=${filterValues}&fields=id,file_id,attachment_name&limit=-1`, {
                headers: {
                    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                    "Content-Type": "application/json"
                },
                cache: 'no-store'
            });

            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    attachmentsList = json.data.filter((a: { id: number; file_id: number; attachment_name: string }) => a.file_id).map((a: { id: number; file_id: number; attachment_name: string }) => ({
                        name: a.attachment_name || "Attachment",
                        url: `/api/crm/customer-hub/callsheet/file?id=${a.file_id}&filename=${encodeURIComponent(a.attachment_name || "Attachment")}`
                    }));
                }
            }
        }
    } catch (e) {
        console.error("Failed to load attachments in document viewer:", e);
    }

    if (attachmentsList.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white p-8 text-center font-sans tracking-tight">
                <div className="max-w-md space-y-4">
                    <h1 className="text-3xl font-black text-white/50">No Document Found</h1>
                    <p className="text-sm text-white/40">We couldn&apos;t load the requested documents. The transaction reference might be invalid or the files have been purged.</p>
                </div>
            </div>
        );
    }

    return <DocumentViewerClient attachments={attachmentsList} />;
}
