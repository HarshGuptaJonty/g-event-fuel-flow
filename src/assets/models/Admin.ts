export interface Admin {
    data?: {
        fullName?: string
        male: boolean,
        contact?: {
            countryCode?: string,
            phoneNumber?: string
        },
        importantTimes?: {
            lastSeen?: number
        },
        permission?: {
            verified: boolean,
            blocked: boolean
        },
        userID?: string
    }
}