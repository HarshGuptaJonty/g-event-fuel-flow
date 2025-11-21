export interface StatCardData {
    dataType: string;
    title: string;
    value?: number | string;
    percentValue?: number;
    listData?: StatCardListData[];
    customClass?: string;
    listCustomClass?: string;
    canExpand?: boolean;
    isExpanded?: boolean;
    collapseCount?: number;
    canExport?: boolean;
    exportData?: any[];
}

export interface StatCardListData {
    title: string;
    value?: number | string;
    percentValue?: number;
    link?: string;
}

export interface StatListWithProduct extends StatCardListData {
    index?: number;
    productList: {
        name: string;
        id: string;
        value?: number | string;
    }[];
}