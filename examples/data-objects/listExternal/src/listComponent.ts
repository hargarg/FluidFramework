/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IRequest,
    IResponse,
    IFluidHandle,
} from "@fluidframework/core-interfaces";
import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { SharedDirectory, IDirectoryValueChanged } from "@fluidframework/map";
import { v4 as uuid } from "uuid";
import { ConfigKey } from "./configKey";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pkg = require("../package.json");
const ListComponentName = pkg.name as string;

// Sample agent to run.
export class ListComponent extends DataObject {
    private lists?: SharedDirectory;

    /**
     *
     */
    public static getFactory() {
        return ListComponent.factory;
    }

    private static readonly factory = new DataObjectFactory(
        ListComponentName,
        ListComponent,
        [SharedDirectory.getFactory()],
        {},
        [],
        true,
    );

    protected async initializingFirstTime() {
        const lists = SharedDirectory.create(this.runtime, "lists");
        this.root.set("lists", lists.handle);

        this.root.set(ConfigKey.docId, this.runtime.id);
    }

    protected async hasInitialized() {
        const [listsHandle] = await Promise.all([
            this.root.wait<IFluidHandle<SharedDirectory>>("lists"),
        ]);

        this.lists = await listsHandle.get();
        this.hasValueChanged();
        this.forwardEvent(this.lists, "op", "sequenceDelta");
    }

    public hasValueChanged() {
        if (this.lists !== undefined) {
            this.lists.on("valueChanged", (changed: IDirectoryValueChanged) => {
                this.emit("listChanged", changed);
            });
            return "cool";
        }
    }
    /**
     *
     */
    public getAllListItems() {
        const data: any = [];
        const subdirs = this.lists?.subdirectories();
        if (subdirs) {
            for (const [name, subdir] of subdirs) {
                const item = {};
                item[name] = [];
                subdir.forEach((val, key_attr) => {
                    item[name].push({ key: key_attr, value: val });
                })
                data.push(item);
            }
        }
        return data;
    }

    /**
     *
     * @param listId
     */
    public createListItem(listId?: string) {
        this.emit("createdList", listId);
        if (listId !== undefined) {
            this.lists?.createSubDirectory(listId);
            return listId;
        } else {
            const id = uuid();
            this.lists?.createSubDirectory(id);
            return id;
        }
    }

    /**
     *
     * @param listId
     */
    public getListItemDirectory(listId: string) {
        return this.lists?.getSubDirectory(listId);
    }

    /**
     *
     * @param listId
     * @param key
     * @param value
     */
    public insertValueInListItem(listId: string, key: string, value: any) {
        this.emit("insertOrUpdateAttribute", listId, key);
        this.lists?.getSubDirectory(listId).set(key, value);
    }

    /**
     *
     * @param listId
     * @param key
     */
    public getKeyValueInList(listId: string, key: string) {
        this.lists?.getSubDirectory(listId).get(key);
    }

    public async request(request: IRequest): Promise<IResponse> {
        return {
            mimeType: "fluid/object",
            status: 200,
            value: this,
        };
    }
}
