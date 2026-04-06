declare module "react-barcode" {
    import React from "react";
    interface BarcodeProps {
        value: string;
        format?: string;
        width?: number;
        height?: number;
        displayValue?: boolean;
        text?: string;
        fontOptions?: string;
        font?: string;
        textAlign?: string;
        textPosition?: string;
        textMargin?: number;
        fontSize?: number;
        background?: string;
        lineColor?: string;
        margin?: number;
        marginTop?: number;
        marginBottom?: number;
        marginLeft?: number;
        marginRight?: number;
        renderer?: string;
    }
    const Barcode: React.FC<BarcodeProps>;
    export default Barcode;
}
