export interface Product {
    data: {
        name: string;
        rate?: number;
        extraNote?: string;
        productId: string;
        productReturnable: boolean;
    },
    others?: {
        createdBy?: string;
        createdTime?: number;
        editedBy?: string;
        editedTime?: number;
    }
}

export interface ProductQuantity {
    productData: {
        name: string;
        rate: number;
        productId: string;
        productReturnable: boolean;
    },
    sentUnits: number;
    recievedUnits: number;
    paymentAmt: number;
}