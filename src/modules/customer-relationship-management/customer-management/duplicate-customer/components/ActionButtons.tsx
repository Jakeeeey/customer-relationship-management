import React from "react";
import { Button } from "@/components/ui/button";
import { EyeOff } from "lucide-react";

interface ActionButtonsProps {
    onDismiss: () => void;
    size?: "default" | "sm" | "icon";
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
    onDismiss, 
    size = "default" 
}) => {
    return (
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size={size} 
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground hover:bg-muted border-border font-bold text-[10px] uppercase tracking-widest h-9 px-4"
            >
                <EyeOff className="h-4 w-4 mr-2" />
                Dismiss Duplicate
            </Button>
        </div>
    );
};
