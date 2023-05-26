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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import PluginModal from "@components/PluginSettings/PluginModal";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode } from "@webpack";
import { Alerts, Menu, Popout, Switch, useState } from "@webpack/common";
import type { ReactNode } from "react";

const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));

const settings = definePluginSettings({
    // for enabling and disabling Vencord-wide quick actions
    RelaunchDiscord: {
        type: OptionType.COMPONENT,
        description: "Relaunch Discord",
        default: true,
        component: () =>
            <Switch
                value={settings.store.RelaunchDiscord}
                onChange={(v: boolean) => settings.store.RelaunchDiscord = v}
                disabled={IS_WEB}
                note="Display Relaunch Discord entry in toolbox"
            >
                Relaunch Discord
            </Switch>
    },
    Notifications: {
        type: OptionType.COMPONENT,
        description: "Open Notification Log",
        default: true,
        component: () =>
            <Switch
                value={settings.store.Notifications}
                onChange={(v: boolean) => settings.store.Notifications = v}
                note="Display Notifications Log entry in toolbox"
            >
                Notification Log
            </Switch>
    },
    QuickCSS: {
        type: OptionType.COMPONENT,
        description: "Open QuickCSS",
        default: true,
        component: () =>
            <Switch
                value={settings.store.QuickCSS}
                onChange={(v: boolean) => settings.store.QuickCSS = v}
                note="Display QuickCSS entry in toolbox"
            >
                QuickCSS
            </Switch>
    },
    disableQuickCSS: {
        type: OptionType.COMPONENT,
        description: "Toggle QuickCSS",
        default: true,
        component: () =>
            <Switch
                value={settings.store.disableQuickCSS}
                onChange={(v: boolean) => settings.store.disableQuickCSS = v}
                note="Display quick enable/disable QuickCSS in toolbox"
            >
                Enable/Disable QuickCSS toggle
            </Switch>
    },
    UpdaterTab: {
        type: OptionType.COMPONENT,
        description: "Add Updater",
        default: false,
        component: () =>
            <Switch
                value={settings.store.UpdaterTab}
                onChange={(v: boolean) => settings.store.UpdaterTab = v}
                disabled={IS_WEB}
                note="Display UpdaterTab entry in toolbox"
            >
                UpdaterTab
            </Switch>
    },

    // for enabling and disabling misc plugin quick actions
    BadgeAPI: {
        type: OptionType.COMPONENT,
        description: "BadgeAPI settings",
        default: true,
        component: () =>
            <Switch
                value={settings.store.BadgeAPI}
                onChange={(v: boolean) => settings.store.BadgeAPI = v}
                note="Display BadgeAPI entry in toolbox"
            >
                BadgeAPI
            </Switch>
    },
    DevCompanion: {
        type: OptionType.COMPONENT,
        description: "DevCompanion settings",
        default: true,
        component: () =>
            <Switch
                value={settings.store.DevCompanion}
                onChange={(v: boolean) => settings.store.DevCompanion = v}
                note="Display DevCompanion Reconnect entry in toolbox"
            >
                DevCompanion
            </Switch>
    },
    // For enabling and disabling individual plugin settings menus
    PluginSettings: {
        type: OptionType.COMPONENT,
        description: "Plugin Settings",
        default: true,
        component: () =>
            <Switch
                value={settings.store.PluginSettings}
                onChange={(v: boolean) => settings.store.PluginSettings = v}
                note="Display plugin settings group for adding or removing plugin settings from toolbox"
            >
                Plugin Settings
            </Switch>

    },
});

function VencordPopout({ onClose }: { onClose: () => void; }) { // could be what's causing bot problem
    const ps = settings.use(["includedPlugins"] as any) as unknown as { includedPlugins: string[]; }; // keeps track of added plugin settings entries
    const { includedPlugins = [] } = ps;
    const pluginEnabledEntries = [] as string[]; // keeps track of vencord-wide added quick actions

    // for Vencord-wide quick actions ex) quickCss, updater, notification log
    for (const [settingsName, enabled] of Object.entries(settings.store)) {
        if (enabled) {
            pluginEnabledEntries.push(settingsName);
        }
    }

    return (
        <Menu.Menu
            navId="vc-toolbox"
            onClose={onClose}>

            {!IS_WEB && settings.store.RelaunchDiscord &&
                <Menu.MenuItem
                    id="vc-toolbox-relaunchdiscord"
                    label="Relaunch Discord"
                    action={() => relaunch()}
                />
            }

            {settings.store.Notifications &&
                <Menu.MenuItem
                    id="vc-toolbox-notifications"
                    label="Open Notification Log"
                    action={openNotificationLogModal}
                />
            }
            <Menu.MenuGroup label="Vencord Settings">
                {settings.store.QuickCSS &&
                    <Menu.MenuItem
                        id="vc-toolbox-quickcss"
                        label="Open QuickCSS"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                }

                {settings.store.disableQuickCSS &&
                    <Menu.MenuItem
                        id="vc-toolbox-disable-quickcss"
                        label="Toggle QuickCSS"
                        action={() => { Vencord.Settings.useQuickCss = !Vencord.Settings.useQuickCss; }}
                    />
                }

                {!IS_WEB && settings.store.UpdaterTab &&
                    <Menu.MenuItem
                        id="vc-toolbox-updater-tab"
                        label="Open Updater"
                        action={openUpdaterModal}
                    />
                }
            </Menu.MenuGroup>

            {Object.values(Vencord.Plugins.plugins) // misc plugin quick actions ex) DevCompanion and BadgesAPI
                .filter(plugin => plugin.toolboxActions && Vencord.Plugins.isPluginEnabled(plugin.name) && pluginEnabledEntries.includes(plugin.name))
                .map(plugin => (
                    <Menu.MenuGroup
                        label={plugin.name}
                        key={`vc-toolbox-${plugin.name}`}>
                        {plugin.toolboxActions && Object.entries(plugin.toolboxActions).map(([text, action]) => {
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
                ))
            }

            {settings.store.PluginSettings && // Main plugin setttings dropdown w/ checkboxes
                <Menu.MenuGroup label="Plugin Settings">
                    {settings.store.PluginSettings &&
                        Object.values(Vencord.Plugins.plugins)
                            .filter(plugin => includedPlugins.includes(plugin.name))
                            .map(plugin => {
                                return (
                                    <Menu.MenuItem
                                        id={"vc-toolbox-" + plugin.name}
                                        key={"vc-toolbox-key-" + plugin.name}
                                        label={plugin.name}
                                        action={() => {
                                            openModal(modalProps => (
                                                <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={() => {
                                                    Alerts.show({
                                                        title: "Restart required",
                                                        body: (
                                                            <>
                                                                <p>The following plugins require a restart:</p>
                                                                <div>{plugin.name}</div>
                                                            </>
                                                        ),
                                                        confirmText: "Restart now",
                                                        cancelText: "Later!",
                                                        onConfirm: () => location.reload()
                                                    });
                                                }} />
                                            ));
                                        }}
                                    />
                                );
                            })}
                    <Menu.MenuItem
                        id="vc-toolbox-plugins"
                        label="Add or Remove Plugins">
                        {Object.values(Vencord.Plugins.plugins).filter(p => p.settings && Vencord.Plugins.isPluginEnabled(p.name)).map(plugin => {
                            const checked = includedPlugins.some(p => p === plugin.name);
                            return (
                                <Menu.MenuCheckboxItem
                                    key={"vc-toolbox-key-" + plugin.name}
                                    id={"vc-toolbox-" + plugin.name}
                                    label={plugin.name}
                                    checked={checked}
                                    action={() => { // when checked adds plugin to toolbox
                                        ps.includedPlugins = checked
                                            ? includedPlugins.filter(p => p !== plugin.name)
                                            : [...includedPlugins, plugin.name];
                                    }}
                                />
                            );
                        })}
                    </Menu.MenuItem>
                </Menu.MenuGroup>}
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
            renderPopout={() => <VencordPopout onClose={() => setShow(false)} />}
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
    description: "Adds a button next to the inbox button in the channel header that houses Vencord quick actions.",
    authors: [Devs.Ven, Devs.AutumnVN],
    settings,

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
