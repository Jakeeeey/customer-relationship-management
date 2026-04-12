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
                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 border-slate-200"
            >
                <EyeOff className="h-4 w-4 mr-2" />
                Dismiss
            </Button>
        </div>
    );
};
