import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { BehaviorSubject, Subject } from "rxjs";
import { FirebaseService } from "./firebase.service";
import { NotificationService } from "./notification.service";
import { Tags } from "../../assets/models/Tags";
import { AccountService } from "./account.service";
import { LOCAL_STORAGE_KEYS } from "../shared/constants";

@Injectable({
    providedIn: 'root'
})
export class TagService {

    private tagObject = {};
    private tagList = new BehaviorSubject<any>(null);
    tagList$ = this.tagList.asObservable();

    isDataChanged = new Subject<boolean>();

    constructor(
        private afAuth: AngularFireAuth,
        private firebaseService: FirebaseService,
        private notificationService: NotificationService,
        private accountService: AccountService,
    ) {
        const storedTagObject = localStorage.getItem(LOCAL_STORAGE_KEYS.TAG_DATA);
        if (storedTagObject)
            this.tagObject = JSON.parse(storedTagObject);

        this.initialize();
    }

    private async initialize(showNotification = false) {
        this.tagObject = await this.firebaseService.getData('tagList');
        localStorage.setItem(LOCAL_STORAGE_KEYS.TAG_DATA, JSON.stringify(this.tagObject));

        if (Object.keys(this.tagObject).length > 0) {
            this.tagList.next(this.tagObject);
            this.isDataChanged.next(true);
        } else {
            this.tagList.next(null);
            this.isDataChanged.next(false);

            if (showNotification) {
                this.notificationService.showNotification({
                    heading: 'No tag to show!',
                    duration: 5000,
                    leftBarColor: this.notificationService.color.red
                });
            }
        }
    }

    hardRefresh() {
        this.initialize(true);
    }

    getTagList() {
        return this.tagList.value || {};
    }

    getTagObject() {
        return this.tagObject || {};
    }

    hasTagData() {
        return Object.values(this.getTagList()).length > 0;
    }

    addNewTag(tag: Tags, isEditing = false) {
        this.firebaseService.setData(`tagList/${tag.data.tagId}`, tag).then(() => {
            const objects = this.tagList.getValue() || {};
            objects[tag.data.tagId] = tag;
            this.tagList.next(objects);
            this.isDataChanged.next(true);

            this.notificationService.showNotification({
                heading: isEditing ? 'Tag edited.' : 'New tag added.',
                message: tag.data.name + ' saved successfully.',
                duration: 5000,
                leftBarColor: this.notificationService.color?.green
            });
        }).catch(() => {
            this.isDataChanged.next(false);
            this.notificationService.somethingWentWrong('122');
        });
    }

    createAndAddNewTags(tag: Tags) {
        const newTag: Tags = {
            data: tag.data,
            others: {
                createdBy: this.accountService.getUserId(),
                createdTime: Date.now()
            }
        }

        this.addNewTag(newTag);
    }

    deleteTag(tag: Tags) {
        this.firebaseService.setData(`tagList/${tag.data.tagId}`, null).then(() => {
            const objects = this.tagList.getValue() || {};
            delete objects[tag.data.tagId];
            this.tagList.next(objects);
            this.isDataChanged.next(true);

            this.notificationService.showNotification({
                heading: 'Tag deleted!',
                message: 'Data erased successfully.',
                duration: 5000,
                leftBarColor: this.notificationService.color?.green
            });
        }).catch(() => {
            this.isDataChanged.next(false);
            this.notificationService.somethingWentWrong('123');
        });
    }
}