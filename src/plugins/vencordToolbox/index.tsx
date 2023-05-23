/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./index.css";

import { definePluginSettings } from "@api/Settings";
import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode } from "@webpack";
import { Menu, Popout, useState, Switch} from "@webpack/common";
import type { ReactNode } from "react";
import { openModal } from "@utils/modal";
import PluginModal from "@components/PluginSettings/PluginModal";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";

const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));

const settings = definePluginSettings({
    QuickCSS: {
        type: OptionType.BOOLEAN,
        description: "Open QuickCSS",
        default: true,
    },
    Notifications: {
        type: OptionType.BOOLEAN,
        description: "Open Notification Log",
        default: true,
    },
    // UpdaterTab: {
    //     type: OptionType.BOOLEAN,
    //     description: "Open Updater Modal",
    //     default: true,
    // },
    BadgeAPI: {
        type: OptionType.BOOLEAN,
        description: "BadgeAPI settings",
        default: true,
    },
    DevCompanion: {
        type: OptionType.BOOLEAN,
        description: "DevCompanion settings",
        default: true,
    },
    TextReplace: {
        type: OptionType.BOOLEAN,
        description: "TextReplace settings",
        default: true,
    },
    VencordToolbox: {
        type: OptionType.BOOLEAN,
        description: "VencordToolbox settings",
        default: true,
    },
    UpdaterTab: {
        type: OptionType.COMPONENT,
        description: "Add Updater to toolbox",
        component: () =>
        <Switch
            value={settings.store.UpdaterTab}
            onChange={(v: boolean) => settings.store.UpdaterTab = v}
            disabled={IS_WEB}
        >
            Add Updater to toolbox
        </Switch>
    },
})

function VencordPopout(onClose: () => void) {
    const pluginEntries = [] as ReactNode[];
    const excludedPluginNames = [] as string[];
    for (const [settingsName, enabled] of Object.entries(settings.store)) {
        if (!enabled) {
            excludedPluginNames.push(settingsName);
        }
    }

    for (const plugin of Object.values(Vencord.Plugins.plugins)) {
        if (plugin.toolboxActions && !excludedPluginNames.includes(plugin.name) && Vencord.Plugins.isPluginEnabled(plugin.name)) {
            pluginEntries.push(
                <Menu.MenuGroup
                    label={plugin.name}
                    key={`vc-toolbox-${plugin.name}`}
                >
                    {Object.entries(plugin.toolboxActions).map(([text, action]) => {
                        const key = `vc-toolbox-${plugin.name}-${text}`;

                        return (
                            <Menu.MenuItem
                                id={key}
                                key={key}
                                label={text}
                                action={action}
                            />
                        );
                    })}
                </Menu.MenuGroup>
            );
        }
    }

    return (
        <Menu.Menu
            navId="vc-toolbox"
            onClose={onClose}>

            {settings.store.Notifications &&
                <Menu.MenuItem
                    id="vc-toolbox-notifications"
                    label="Open Notification Log"
                    action={openNotificationLogModal}
                />
            }

            {settings.store.QuickCSS &&
                <Menu.MenuItem
                    id="vc-toolbox-quickcss"
                    label="Open QuickCSS"
                    action={() => VencordNative.quickCss.openEditor()}
                />
            }

            {!IS_WEB && settings.store.UpdaterTab &&
                <Menu.MenuItem
                    id="vc-toolbox-updater-tab"
                    label="Open Updater"
                    action={openUpdaterModal}
                /> }

            {...pluginEntries}
        </Menu.Menu>

    );
}

function VencordPopoutIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={24} height={24}>
            <path fill="currentColor" d="M53 10h7v1h-1v1h-1v1h-1v1h-1v1h-1v1h5v1h-7v-1h1v-1h1v-1h1v-1h1v-1h1v-1h-5m-43 1v32h2v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h8v-2h2V46h-2v2h-2v2h-4v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2V12m24 0v27h-2v3h4v-6h2v-2h4V12m13 2h5v1h-1v1h-1v1h-1v1h3v1h-5v-1h1v-1h1v-1h1v-1h-3m8 5h1v5h1v-1h1v1h-1v1h1v-1h1v1h-1v3h-1v1h-2v1h-1v1h1v-1h2v-1h1v2h-1v1h-2v1h-1v-1h-1v1h-6v-1h-1v-1h-1v-2h1v1h2v1h3v1h1v-1h-1v-1h-3v-1h-4v-4h1v-2h1v-1h1v-1h1v2h1v1h1v-1h1v1h-1v1h2v-2h1v-2h1v-1h1m-13 4h2v1h-1v4h1v2h1v1h1v1h1v1h4v1h-6v-1h-6v-1h-1v-5h1v-1h1v-2h2m17 3h1v3h-1v1h-1v1h-1v2h-2v-2h2v-1h1v-1h1m1 0h1v3h-1v1h-2v-1h1v-1h1m-30 2v8h-8v32h8v8h32v-8h8v-8H70v8H54V44h16v8h16v-8h-8v-8h-1v1h-7v-1h-2v1h-8v-1" />
        </svg>
    );
}

function VencordPopoutButton() {
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            renderPopout={() => VencordPopout(() => setShow(false))}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    className="vc-toolbox-btn"
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Vencord Toolbox"}
                    icon={VencordPopoutIcon}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

function ToolboxFragmentWrapper({ children }: { children: ReactNode[]; }) {
    children.splice(
        children.length - 1, 0,
        <ErrorBoundary noop={true}>
            <VencordPopoutButton />
        </ErrorBoundary>
    );

    return <>{children}</>;
}

export default definePlugin({
    name: "VencordToolbox",
    description: "Adds a button next to the inbox button in the channel header that houses Vencord quick actions",
    authors: [Devs.Ven, Devs.AutumnVN],
    settings,

    toolboxActions: {
        "Enabled/Disable Entries": () => {
            const plugin = Vencord.Plugins.plugins.VencordToolbox;
            if (!plugin) return;
            Vencord.Plugins.plugins
            openModal(modalProps => (
                <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={() => null} />
            ));
        },
    },

    patches: [
        {
            find: ".mobileToolbar",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "$self.ToolboxFragmentWrapper,"
            }
        }
    ],

    ToolboxFragmentWrapper: ErrorBoundary.wrap(ToolboxFragmentWrapper, {
        fallback: () => <p style={{ color: "red" }}>Failed to render :(</p>
    })
});
