"use client";

import * as React from "react";
import { AnnouncementModal } from "./announcement-modal";
import { Announcement } from "@/types/announcement";

export function GlobalAnnouncementModal() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);

    React.useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            fetch("/api/crm/announcements?includeAcknowledged=true")
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch announcements");
                })
                .then(data => {
                    setAnnouncements(data.announcements || []);
                })
                .catch(err => {
                    console.error("Failed to load global announcements:", err);
                });
        };

        window.addEventListener("open-announcements", handleOpen);
        return () => window.removeEventListener("open-announcements", handleOpen);
    }, []);

    if (!isOpen) return null;

    return (
        <AnnouncementModal
            open={isOpen}
            onOpenChange={setIsOpen}
            announcements={announcements}
            mode="view-only"
        />
    );
}
