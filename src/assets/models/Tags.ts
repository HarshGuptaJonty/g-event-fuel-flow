export interface Tags {
    data: {
        name: string;
        colorCode: string;
        extraNote?: string;
        tagId: string;
    },
    others?: {
        createdBy?: string;
        createdTime?: number;
        editedBy?: string;
        editedTime?: number;
    }
}