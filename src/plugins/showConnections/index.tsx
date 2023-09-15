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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { CopyIcon, LinkIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { Text, Tooltip, UserProfileStore } from "@webpack/common";
import { User } from "discord-types/general";

import { VerifiedIcon } from "./VerifiedIcon";

const Section = LazyComponent(() => findByCode("().lastSection"));
const ThemeStore = findStoreLazy("ThemeStore");
const platforms: { get(type: string): ConnectionPlatform; } = findByPropsLazy("isSupported", "getByUrl");
const getTheme: (user: User, displayProfile: any) => any = findByCodeLazy(',"--profile-gradient-primary-color"');

const enum Spacing {
    COMPACT,
    COZY,
    ROOMY
}
const getSpacingPx = (spacing: Spacing | undefined) => (spacing ?? Spacing.COMPACT) * 2 + 4;

const settings = definePluginSettings({
    iconSize: {
        type: OptionType.NUMBER,
        description: "Icon size (px)",
        default: 32
    },
    iconSpacing: {
        type: OptionType.SELECT,
        description: "Icon margin",
        default: Spacing.COZY,
        options: [
            { label: "Compact", value: Spacing.COMPACT },
            { label: "Cozy", value: Spacing.COZY }, // US Spelling :/
            { label: "Roomy", value: Spacing.ROOMY }
        ]
    }
});

interface Connection {
    type: string;
    id: string;
    name: string;
    verified: boolean;
}

interface ConnectionPlatform {
    getPlatformUserUrl(connection: Connection): string;
    icon: { lightSVG: string, darkSVG: string; };
}

const profilePopoutComponent = ErrorBoundary.wrap(e =>
    <ConnectionsComponent id={e.user.id} theme={getTheme(e.user, e.displayProfile).profileTheme} />
);

const profilePanelComponent = ErrorBoundary.wrap(e =>
    <ConnectionsComponent id={e.channel.recipients[0]} theme={ThemeStore.theme} />
);

function ConnectionsComponent({ id, theme }: { id: string, theme: string; }) {
    const profile = UserProfileStore.getUserProfile(id);
    if (!profile)
        return null;

    const connections: Connection[] = profile.connectedAccounts;
    if (!connections?.length)
        return null;

    return (
        <Section>
            <Text
                tag="h2"
                variant="eyebrow"
                style={{ color: "var(--header-primary)" }}
            >
                Connections
            </Text>
            <Flex style={{
                marginTop: "8px",
                gap: getSpacingPx(settings.store.iconSpacing),
                flexWrap: "wrap"
            }}>
                {connections.map(connection => <CompactConnectionComponent connection={connection} theme={theme} />)}
            </Flex>
        </Section>
    );
}

function CompactConnectionComponent({ connection, theme }: { connection: Connection, theme: string; }) {
    const platform = platforms.get(connection.type);
    const url = platform.getPlatformUserUrl?.(connection);

    const img = (
        <img
            aria-label={connection.name}
            src={theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG}
            style={{
                width: settings.store.iconSize,
                height: settings.store.iconSize
            }}
        />
    );

    const TooltipIcon = url ? LinkIcon : CopyIcon;

    return (
        <Tooltip
            text={
                <span className="vc-sc-tooltip">
                    {connection.name}
                    {connection.verified && <VerifiedIcon />}
                    <TooltipIcon height={16} width={16} />
                </span>
            }
            key={connection.id}
        >
            {tooltipProps =>
                url
                    ? <a
                        {...tooltipProps}
                        className="vc-user-connection"
                        href={url}
                        target="_blank"
                        onClick={e => {
                            if (Vencord.Plugins.isPluginEnabled("OpenInApp")) {
                                const OpenInApp = Vencord.Plugins.plugins.OpenInApp as any as typeof import("../openInApp").default;
                                // handleLink will .preventDefault() if applicable
                                OpenInApp.handleLink(e.currentTarget, e);
                            }
                        }}
                    >
                        {img}
                    </a>
                    : <button
                        {...tooltipProps}
                        className="vc-user-connection"
                        onClick={() => copyWithToast(connection.name)}
                    >
                        {img}
                    </button>

            }
        </Tooltip>
    );
}

export default definePlugin({
    name: "ShowConnections",
    description: "Show connected accounts in user popouts",
    authors: [Devs.TheKodeToad],
    patches: [
        {
            find: ".Messages.BOT_PROFILE_SLASH_COMMANDS",
            replacement: {
                match: /,theme:\i\}\)(?=,.{0,100}setNote:)/,
                replace: "$&,$self.profilePopoutComponent(arguments[0])"
            }
        },
        {
            find: "\"Profile Panel: user cannot be undefined\"",
            replacement: {
                // createElement(Divider, {}), createElement(NoteComponent)
                match: /\(0,\i\.jsx\)\(\i\.\i,\{\}\).{0,100}setNote:/,
                replace: "$self.profilePanelComponent(arguments[0]),$&"
            }
        }
    ],
    settings,
    profilePopoutComponent,
    profilePanelComponent
});
