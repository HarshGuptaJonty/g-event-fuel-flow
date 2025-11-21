import { Subject } from "rxjs"

export interface ConfirmationModel {
    id?: string

    heading: string
    message?: string

    leftButton?: Button
    rightButton?: Button

    actionSubject?: Subject<any>
}

interface Button {
    text: string,
    customClass?: string,
    disabled?: boolean
}