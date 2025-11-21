import { UserData } from "./EntryTransaction";
import { ProductQuantity } from "./Product";

export interface DataForExportFormat {
    date: string,
    customer: {
        fullName: string,
        phoneNumber: string,
        userId: string
    },
    deliveryBoyList: UserData[];
    totalAmt: number;
    paymentAmt: number;
    transactionId: string;
    shippingAddress: string;
    productDetail: ProductQuantity[];
    extraNote: string;
    status: string;
}

export interface ExportModel {
    hasSelectedRows: boolean
    hasSelectedCustomer: boolean
}

export interface ExportPenidngReturns {
    customerName: string;
    pendingProducts: {
        name: string;
        pending: number;
    }[];
    totalPending: number;
}