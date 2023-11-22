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
import { definePluginSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";
import { filters, find } from "@webpack";
import { Menu, Popout, useState } from "@webpack/common";
import type { ReactNode } from "react";


const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

function settingsBool(description: string, disabled = false): PluginSettingDef {
    return {
        type: OptionType.BOOLEAN,
        description: description,
        default: true,
        hidden: disabled,
    };
}

const settings = definePluginSettings({
    // for enabling and disabling Vencord-wide and Discord-wide quick actions
    relaunchDiscord: settingsBool("Quit and restart discord from toolbox", IS_WEB),
    notifs: settingsBool("View notifications log from toolbox"),
    quickCss: settingsBool("Edit QuickCss from toolbox"),
    toggleQuickCss: settingsBool("Enable/Disable QuickCss from toolbox"),
    updater: settingsBool("Open UpdaterTab from toolbox", IS_WEB),

    // for enabling and disabling Vencord-wide and Discord-wide quick actions
    discordTools: settingsBool("Pin discord tools to toolbox"),

    // for enabling and disabling misc plugin quick actions
    pluginActions: settingsBool("Pin plugin quick actions to toolbox"),

    // for enabling and disabling individual plugin settings
    pluginSettings: settingsBool("Pin plugin settings to toolbox"),
}).withPrivateSettings<{
    pinnedSettings: string[];
    pinnedActions: string[];
}>();

function VencordPopout(onClose: () => void) {
    // keeps track of added plugin settings entries ex) textreplace, quickreply
    const ps = settings.use(["pinnedSettings", "pinnedActions"]);
    const { pinnedSettings = [], pinnedActions = [] } = ps;

    const allSettingsRNList = [] as ReactNode[]; // all enabled plugins if they have settings
    const pinnedSettingsRNList = [] as ReactNode[]; // pinned plugin settings
    const allActionsRNList = [] as ReactNode[]; // all possible plugin actions
    const pinnedActionsRNList = [] as ReactNode[]; // pinned actions

    for (const plugin of Object.values(Vencord.Plugins.plugins).filter(p => Vencord.Plugins.isPluginEnabled(p.name))) {
        if (plugin.toolboxActions) {
            const checkedActions = pinnedActions.some(p => p === plugin.name);
            allActionsRNList.push(
                <Menu.MenuCheckboxItem
                    key={"vc-toolbox-actioncb-key-" + plugin.name}
                    id={"vc-toolbox-actioncb-" + plugin.name}
                    label={plugin.name}
                    checked={checkedActions}
                    action={() => { // when checkedActions pins action to toolbox
                        ps.pinnedActions = checkedActions
                            ? pinnedActions.filter(p => p !== plugin.name)
                            : [...pinnedActions, plugin.name];
                    }}
                />
            );

            if (pinnedActions.includes(plugin.name)) { // actions pinned to toolbox
                pinnedActionsRNList.push(
                    <Menu.MenuGroup
                        label={plugin.name}
                        key={`vc-toolbox-${plugin.name}`}>
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

        if (plugin.settings) { // if plugin has settings make checkbox option
            const checkedSettings = pinnedSettings.some(p => p === plugin.name);
            allSettingsRNList.push(
                <Menu.MenuCheckboxItem
                    key={"vc-toolbox-checkbox-key-" + plugin.name}
                    id={"vc-toolbox-checkbox-" + plugin.name}
                    label={plugin.name}
                    checked={checkedSettings}
                    action={() => { // when checkedSettings pins plugin to toolbox
                        ps.pinnedSettings = checkedSettings
                            ? pinnedSettings.filter(p => p !== plugin.name)
                            : [...pinnedSettings, plugin.name];
                    }}
                />
            );
            if (pinnedSettings.includes(plugin.name)) { // plugins that have been pinned to toolbox
                pinnedSettingsRNList.push(
                    <Menu.MenuItem
                        id={"vc-toolbox-settings-" + plugin.name}
                        key={"vc-toolbox-settings-key-" + plugin.name}
                        label={plugin.name}
                        action={() => {
                            // openModal(modalProps => (
                            //  <PluginModal
                            //    {...modalProps}
                            //  plugin={plugin}
                            // onRestartNeeded={() => showToast("Restart to apply changes!")} />
                            // ));
                        }}
                    />
                );
            }
        }
    }

    return (
        <Menu.Menu
            navId="vc-toolbox"
            onClose={onClose}
        >
            <Menu.MenuGroup label="Custom Actions">
                {settings.store.pluginActions &&
                    <Menu.MenuItem
                        id="vc-toolbox-actions"
                        label="Pin or Unpin Actions">
                        {...allActionsRNList}
                    </Menu.MenuItem>
                }
            </Menu.MenuGroup>
            {...pinnedActionsRNList}

            <Menu.MenuGroup label="Plugin Settings">
                {settings.store.pluginSettings &&
                    <Menu.MenuItem
                        id="vc-toolbox-plugins"
                        label="Pin or Unpin Plugins">
                        {...allSettingsRNList}
                    </Menu.MenuItem>
                }
                {...pinnedSettingsRNList}
            </Menu.MenuGroup>

            <Menu.MenuGroup label="App Tools">
                {!IS_WEB && settings.store.relaunchDiscord &&
                    <Menu.MenuItem
                        id="vc-toolbox-relaunchdiscord"
                        label="Relaunch Discord"
                        action={() => relaunch()}
                    />
                }
                {settings.store.notifs &&
                    <Menu.MenuItem
                        id="vc-toolbox-notifications"
                        label="Notification Log"
                        action={openNotificationLogModal}
                    />
                }
                {settings.store.quickCss &&
                    <Menu.MenuItem
                        id="vc-toolbox-quickcss"
                        label="Edit QuickCSS"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                }
                {settings.store.toggleQuickCss &&
                    <Menu.MenuCheckboxItem
                        id="vc-toolbox-quickcss-toggle"
                        checked={Settings.useQuickCss}
                        label={"Enable QuickCSS"}
                        action={() => {
                            Settings.useQuickCss = !Settings.useQuickCss;
                            onClose();
                        }}
                    />
                }
                {!IS_WEB && settings.store.updater &&
                    <Menu.MenuItem
                        id="vc-toolbox-updater-tab"
                        label="Open Updater"
                        action={openUpdaterModal}
                    />
                }
            </Menu.MenuGroup>

        </Menu.Menu>
    );
}

function VencordPopoutIcon(isShown: boolean) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" width={24} height={24}>
            <path fill="currentColor" d={isShown ? "M9 0h1v1h1v2h1v2h3V3h1V1h1V0h1v2h1v2h1v7h-1v-1h-3V9h1V6h-1v4h-3v1h1v-1h2v1h3v1h-1v1h-3v2h1v1h1v1h1v3h-1v4h-2v-1h-1v-4h-1v4h-1v1h-2v-4H9v-3h1v-1h1v-1h1v-2H9v-1H8v-1h3V6h-1v3h1v1H8v1H7V4h1V2h1M5 19h2v1h1v1h1v3H4v-1h2v-1H4v-2h1m15-1h2v1h1v2h-2v1h2v1h-5v-3h1v-1h1m4 3h4v1h-4" : "M0 0h7v1H6v1H5v1H4v1H3v1H2v1h5v1H0V6h1V5h1V4h1V3h1V2h1V1H0m13 2h5v1h-1v1h-1v1h-1v1h3v1h-5V7h1V6h1V5h1V4h-3m8 5h1v5h1v-1h1v1h-1v1h1v-1h1v1h-1v3h-1v1h-2v1h-1v1h1v-1h2v-1h1v2h-1v1h-2v1h-1v-1h-1v1h-6v-1h-1v-1h-1v-2h1v1h2v1h3v1h1v-1h-1v-1h-3v-1h-4v-4h1v-2h1v-1h1v-1h1v2h1v1h1v-1h1v1h-1v1h2v-2h1v-2h1v-1h1M8 14h2v1H9v4h1v2h1v1h1v1h1v1h4v1h-6v-1H5v-1H4v-5h1v-1h1v-2h2m17 3h1v3h-1v1h-1v1h-1v2h-2v-2h2v-1h1v-1h1m1 0h1v3h-1v1h-2v-1h1v-1h1"} />
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
                    icon={() => VencordPopoutIcon(isShown)}
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

    patches: [
        {
            find: "toolbar:function",
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
