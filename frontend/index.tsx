import { Millennium, IconsModule, definePlugin, Field, DialogButton } from '@steambrew/client';

function windowCreated(context: any) {
    console.log('[SADH] Window created:', context);
}

const SettingsContent = () => {
    return (
        <Field
            label="Steam Availability & Deals Hub"
            description="Open any game's Steam store page to see the Availability & Deals panel in the right column."
            icon={<IconsModule.Settings />}
            bottomSeparator="standard"
            focusable
        >
            <DialogButton onClick={() => console.log('[SADH] clicked')}>
                About
            </DialogButton>
        </Field>
    );
};

export default definePlugin(() => {
    Millennium.AddWindowCreateHook(windowCreated);

    return {
        title: 'Steam Availability & Deals Hub',
        icon: <IconsModule.Settings />,
        content: <SettingsContent />,
    };
});
