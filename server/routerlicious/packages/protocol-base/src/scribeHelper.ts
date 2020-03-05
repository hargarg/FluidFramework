/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IDocumentAttributes, ITreeEntry, FileMode, TreeEntry } from "@microsoft/fluid-protocol-definitions";
import { ICreateTreeEntry, ITree } from "@microsoft/fluid-gitresources";
import { IQuorumSnapshot } from "./quorum";

export function getQuorumTreeEntries(
    documentId: string,
    minimumSequenceNumber: number,
    sequenceNumber: number,
    quorumSnapshot: IQuorumSnapshot,
): ITreeEntry[] {
    const documentAttributes: IDocumentAttributes = {
        branch: documentId,
        minimumSequenceNumber,
        sequenceNumber,
    };

    const entries: ITreeEntry[] = [
        {
            mode: FileMode.File,
            path: "quorumMembers",
            type: TreeEntry[TreeEntry.Blob],
            value: {
                contents: JSON.stringify(quorumSnapshot.members),
                encoding: "utf-8",
            },
        },
        {
            mode: FileMode.File,
            path: "quorumProposals",
            type: TreeEntry[TreeEntry.Blob],
            value: {
                contents: JSON.stringify(quorumSnapshot.proposals),
                encoding: "utf-8",
            },
        },
        {
            mode: FileMode.File,
            path: "quorumValues",
            type: TreeEntry[TreeEntry.Blob],
            value: {
                contents: JSON.stringify(quorumSnapshot.values),
                encoding: "utf-8",
            },
        },
        {
            mode: FileMode.File,
            path: "attributes",
            type: TreeEntry[TreeEntry.Blob],
            value: {
                contents: JSON.stringify(documentAttributes),
                encoding: "utf-8",
            },
        },
    ];
    return entries;
}

export function mergeAppAndProtocolTree(appSummaryTree: ITree, protocolTree: ITree): ICreateTreeEntry[] {
    const newTreeEntries = appSummaryTree.tree.map((value) => {
        const createTreeEntry: ICreateTreeEntry = {
            mode: value.mode,
            path: value.path,
            sha: value.sha,
            type: value.type,
        };
        return createTreeEntry;
    });
    newTreeEntries.push({
        mode: FileMode.Directory,
        path: ".protocol",
        sha: protocolTree.sha,
        type: "tree",
    });
    return newTreeEntries;
}