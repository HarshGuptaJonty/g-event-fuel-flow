import { ProductQuantity } from "./Product";

export interface EntryTransaction {
    data: {
        date?: string,
        customer?: UserData,
        deliveryBoyList?: DeliveryDone[],
        total?: number,
        payment?: number,
        transactionId: string,
        importIndex?: number,
        extraDetails?: string,
        status?: string,
        shippingAddress?: string,
        selectedProducts?: ProductQuantity[],
        tags?: string[]
    }, others?: {
        createdBy?: string,
        createdTime?: number,

        editedBy?: string,
        editedTime?: number;

        movedBy?: string | null,
        movedTime?: number | null;
        moveIds?: string[];
    }
}

export interface UserData {
    fullName?: string,
    phoneNumber?: string,
    userId: string
}

export interface DeliveryDone extends UserData {
    deliveryDone?: DeliveryData[];
}

export interface DeliveryData {
    productId: string,
    sentUnits: number,
    recievedUnits: number
}

export interface DepositEntry {
    data: {
        date: string
        customer: UserData
        paymentAmt?: number
        returnAmt?: number
        transactionId: string
        extraDetails?: string
        selectedProducts: ProductQuantity[]
    }, others?: {
        createdBy?: string,
        createdTime?: number,
        editedBy?: string,
        editedTime?: number;
    }
}