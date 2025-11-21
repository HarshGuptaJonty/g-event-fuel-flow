export interface ImportModel {
    Date: string;
    Customer: string;
    Address: string;
    "Delivery Person": string;
    Product: string;
    Sent: string | number;
    Receieved: string | number;
    Pending: string | number;
    "Rate/Unit": string | number;
    "Total Amount": string | number;
    "Paid Amount": string | number;
    "Due Amount": string | number;
    "Extra Note": string;
    importId?: string; // extra id o track the imported data
}