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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ContextMenu, FluxDispatcher, Menu } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

interface Sticker {
    id: string;
    format_type: number;
    description: string;
    name: string;
}

enum GreetMode {
    Greet = "Greet",
    NormalMessage = "Message"
}

const settings = definePluginSettings({
    greetMode: {
        type: OptionType.SELECT,
        options: [
            { label: "Greet (you can only greet 3 times)", value: GreetMode.Greet, default: true },
            { label: "Normal Message (you can greet spam)", value: GreetMode.NormalMessage }
        ],
        description: "Choose the greet mode"
    },
    unholyMultiGreetEnabled: {
        type: OptionType.BOOLEAN,
        description: "Unholy greet mode",
        default: false,
    },
});

const MessageActions = findByPropsLazy("sendGreetMessage");

function greet(channel: Channel, message: Message, stickers: string[]) {
    const options = MessageActions.getSendMessageOptionsForReply({
        channel,
        message,
        shouldMention: true,
        showMentionToggle: true
    });

    if (settings.store.greetMode === GreetMode.NormalMessage || stickers.length > 1) {
        options.stickerIds = stickers;
        const msg = {
            content: "",
            tts: false,
            invalidEmojis: [],
            validNonShortcutEmojis: []
        };

        MessageActions._sendMessage(channel.id, msg, options);
    } else {
        MessageActions.sendGreetMessage(channel.id, stickers[0], options);
    }
}


function GreetMenu({ stickers, channel, message }: { stickers: Sticker[], message: Message, channel: Channel; }) {
    const ps = settings.use(["includedPlugins"] as any) as unknown as { includedPlugins: string[]; };
    const { includedPlugins = [] } = ps;

    return (
        <Menu.Menu
            navId="greet-sticker-picker"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Greet Sticker Picker"
        >
            <Menu.MenuGroup
                label="Greet Mode"
            >
            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuGroup
                label="Greet Stickers"
            >
                {stickers.map(sticker => (
                    <Menu.MenuItem
                        key={sticker.id}
                        id={"greet-" + sticker.id}
                        label={sticker.description.split(" ")[0]}
                        action={() => greet(channel, message, [sticker.id])}
                    />
                ))}
            </Menu.MenuGroup>

            {!settings.store.unholyMultiGreetEnabled ? null : (
                <>
                    <Menu.MenuSeparator />

                    <Menu.MenuItem
                        label="Unholy Multi-Greet"
                        id="unholy-multi-greet"
                    >
                        {stickers.map(sticker => {
                            const checked = includedPlugins.some(s => s === sticker.id);

                            return (
                                <Menu.MenuCheckboxItem
                                    key={sticker.id}
                                    id={"multi-greet-" + sticker.id}
                                    label={sticker.description.split(" ")[0]}
                                    checked={checked}
                                    action={() => {
                                        ps.includedPlugins = checked
                                            ? includedPlugins.filter(s => s !== sticker.id)
                                            : [...includedPlugins, sticker.id];
                                    }}
                                />
                            );
                        })}

                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id="multi-greet-submit"
                            label="Send Greets"
                            action={() => greet(channel, message, includedPlugins!)}
                            disabled={includedPlugins.length === 0}
                        />

                    </Menu.MenuItem>
                </>
            )}
        </Menu.Menu>
    );
}

export default definePlugin({
    name: "GreetStickerPicker",
    description: "Allows you to use any greet sticker instead of only the random one by right-clicking the 'Wave to say hi!' button",
    authors: [Devs.Ven],

    settings,

    patches: [
        {
            find: "Messages.WELCOME_CTA_LABEL",
            replacement: {
                match: /innerClassName:\i\(\).welcomeCTAButton,(?<=%\i\.length;return (\i)\[\i\].+?)/,
                replace: "$&onContextMenu:(e)=>$self.pickSticker(e,$1,arguments[0]),"
            }
        }
    ],

    pickSticker(
        event: React.UIEvent,
        stickers: Sticker[],
        props: {
            channel: Channel,
            message: Message;
        }
    ) {
        if (!(props.message as any).deleted)
            ContextMenu.open(event, () => <GreetMenu stickers={stickers} {...props} />);
    }
});
