'use client';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import {
    Bell,
    Building2,
    Clock,
    Globe2,
    Loader2,
    Mail,
    MapPin,
    Moon,
    Palette,
    Phone,
    RotateCcw,
    Save,
    Settings as SettingsIcon,
    Sun,
    Utensils,
    Image as ImageIcon,
} from 'lucide-react';
import { useTheme } from "next-themes"
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { RestaurantSettings } from '../types';
import SettingsPanel from './SettingsPanel';
import Field from './Field';
import SegmentButton from './SegmentButton';
import ToggleRow from './ToggleRow';
import { getInitials } from '@/actions/getInitial';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getCurrencyOptions } from '@/lib/currency';
import { OrderMode } from '@prisma/client';
import { ImageUpload } from '@/components/ui/image-upload';

interface SettingsClientProps {
    initialSettings: RestaurantSettings;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState<RestaurantSettings>(initialSettings);
    const [currentSavedSettings, setCurrentSavedSettings] = useState<RestaurantSettings>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme()
    const [logoUrl, setLogoUrl] = useState<string | null>(initialSettings.logoUrl ?? null);
    const [logoPublicId, setLogoPublicId] = useState<string | null>(initialSettings.logoPublicId ?? null);

    const currencyOptions = useMemo(() => getCurrencyOptions(), []);

    useEffect(() => { setMounted(true) }, []);

    const updateSetting = <Key extends keyof RestaurantSettings>(
        key: Key,
        value: RestaurantSettings[Key],
    ) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        if (!settings.restaurantName.trim()) {
            toast.error("Restaurant name is required");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                restaurantName: settings.restaurantName.trim(),
                tagline: settings.tagline.trim(),
                phone: settings.phone.trim(),
                email: settings.email.trim(),
                address: settings.address.trim(),
                currency: settings.currency,
                gstRate: Number(settings.gstRate),
                serviceCharge: Number(settings.serviceCharge),
                orderMode: settings.orderMode.toUpperCase(),
                averagePrepTime: Number(settings.averagePrepTime),
                autoAcceptOrders: settings.autoAcceptOrders,
                dineInEnabled: settings.dineInEnabled,
                deliveryEnabled: settings.deliveryEnabled,
                logoUrl: logoUrl,
                logoPublicId: logoPublicId,
            };

            const response = await axios.post(
                "/api/settings/save-settings",
                payload
            );
            console.log("Settings saved successfully:", response.data);

            setCurrentSavedSettings({ ...settings, logoUrl, logoPublicId });
            toast.success("Settings saved successfully");

        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message ||
                    error.response?.data?.error ||
                    "Failed to save settings"
                );
            } else {
                toast.error("Failed to save settings");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings(currentSavedSettings);
        toast.success("Settings reset to defaults");
    };

    return (

        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 sm:space-y-8 lg:px-0">
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:pb-6 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                        <SettingsIcon className="size-3.5 shrink-0" />
                        <span className="truncate">Admin settings</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
                    <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Configure restaurant details, appearance, order controls, and operational defaults.
                    </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <Button variant="outline" onClick={handleReset} disabled={saving} size="sm" className="flex-1 sm:flex-none">
                        <RotateCcw className="size-4 shrink-0" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1 sm:flex-none">
                        {saving ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Save className="size-4 shrink-0" />}
                        <span className="hidden sm:inline">{saving ? 'Saving' : 'Save changes'}</span>
                        <span className="sm:hidden">{saving ? 'Saving' : 'Save'}</span>
                    </Button>
                </div>
            </div>

            <div className="grid gap-5  lg:grid-cols-[1.35fr_0.65fr]">
                <section className="min-w-0 space-y-5">
                    <SettingsPanel
                        icon={<Building2 className="size-5" />}
                        title="Restaurant profile"
                        description="These details appear across the admin experience and can be reused for customer-facing screens."
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Restaurant name" htmlFor="restaurant-name">
                                <Input
                                    id="restaurant-name"
                                    value={settings.restaurantName}
                                    onChange={(event) => updateSetting('restaurantName', event.target.value)}
                                    className="w-full bg-background"
                                />
                            </Field>

                            <Field label="Tagline" htmlFor="tagline">
                                <Input
                                    id="tagline"
                                    value={settings.tagline}
                                    onChange={(event) => updateSetting('tagline', event.target.value)}
                                    className="w-full bg-background"
                                />
                            </Field>

                            <Field label="Phone" htmlFor="phone">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="phone"
                                        value={settings.phone}
                                        onChange={(event) => updateSetting('phone', event.target.value)}
                                        className="w-full bg-background pl-9"
                                    />
                                </div>
                            </Field>

                            <Field label="Email" htmlFor="email">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={settings.email}
                                        onChange={(event) => updateSetting('email', event.target.value)}
                                        className="w-full bg-background pl-9"
                                    />
                                </div>
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Address" htmlFor="address">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                        <Input
                                            id="address"
                                            value={settings.address}
                                            onChange={(event) => updateSetting('address', event.target.value)}
                                            className="w-full bg-background pl-9"
                                        />
                                    </div>
                                </Field>
                            </div>

                            <div className="sm:col-span-2">
                                <Field label="Restaurant logo" htmlFor="logo">
                                    <div className="space-y-3">
                                        <ImageUpload
                                            value={logoUrl ?? undefined}
                                            publicId={logoPublicId ?? undefined}
                                            onChange={({ url, publicId }) => {
                                                setLogoUrl(url);
                                                setLogoPublicId(publicId);
                                            }}
                                            onRemove={() => {
                                                setLogoUrl(null);
                                                setLogoPublicId(null);
                                            }}
                                        />
                                        {logoUrl && (
                                            <p className="text-xs text-muted-foreground">
                                                Logo will be used on invoices, customer menu, and admin dashboard.
                                            </p>
                                        )}
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </SettingsPanel>

                    <SettingsPanel
                        icon={<Palette className="size-5" />}
                        title="Appearance"
                        description="Choose the admin theme and accent style. Theme changes apply immediately."
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Theme</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <SegmentButton
                                        active={mounted && theme === 'light'}
                                        icon={<Sun className="size-4" />}
                                        label="Light"
                                        onClick={() => setTheme("light")}
                                    />
                                    <SegmentButton
                                        active={mounted && theme === 'dark'}
                                        icon={<Moon className="size-4" />}
                                        label="Dark"
                                        onClick={() => setTheme("dark")}
                                    />
                                    <SegmentButton
                                        active={mounted && theme === 'system'}
                                        icon={<Globe2 className="size-4" />}
                                        label="System"
                                        onClick={() => setTheme("system")}
                                    />
                                </div>
                            </div>
                        </div>
                    </SettingsPanel>

                    <SettingsPanel
                        icon={<Utensils className="size-5" />}
                        title="Ordering"
                        description="Control availability, charges, currency, and preparation expectations."
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Order mode" htmlFor="order-mode">
                                <Select
                                    value={settings.orderMode}
                                    onValueChange={(value) => updateSetting('orderMode', value as OrderMode)}
                                >
                                    <SelectTrigger id="order-mode" className="w-full bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACCEPTING">Accepting orders</SelectItem>
                                        <SelectItem value="PAUSED">Temporarily paused</SelectItem>
                                        <SelectItem value="CLOSED">Closed for today</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Currency" htmlFor="currency">
                                <SearchableSelect
                                    options={currencyOptions}
                                    value={settings.currency}
                                    onChange={(value) => updateSetting('currency', value || 'INR')}
                                    placeholder="Select currency"
                                />
                            </Field>

                            <Field label="GST rate (%)" htmlFor="gst-rate">
                                <Input
                                    id="gst-rate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.gstRate}
                                    onChange={(event) => updateSetting('gstRate', Number(event.target.value))}
                                    className="w-full bg-background"
                                />
                            </Field>

                            <Field label="Service charge (%)" htmlFor="service-charge">
                                <Input
                                    id="service-charge"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.serviceCharge}
                                    onChange={(event) => updateSetting('serviceCharge', Number(event.target.value))}
                                    className="w-full bg-background"
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Average prep time (minutes)" htmlFor="prep-time">
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                        <Input
                                            id="prep-time"
                                            type="number"
                                            min="1"
                                            value={settings.averagePrepTime}
                                            onChange={(event) => updateSetting('averagePrepTime', Number(event.target.value))}
                                            className="w-full bg-background pl-9"
                                        />
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </SettingsPanel>
                </section>

                <aside className="min-w-0 space-y-5">
                    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-right-2 duration-300 sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold leading-snug">Live preview</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground">How your restaurant profile reads.</p>
                            </div>
                            <span className={`shrink-0 rounded-lg ${settings.orderMode === 'ACCEPTING' ? 'bg-green-500/10  text-green-600' : settings.orderMode === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-200' : 'bg-red-500/10 text-red-500'} px-2 py-1 text-xs font-medium whitespace-nowrap`}>
                                {settings.orderMode === 'ACCEPTING' ? 'Accepting orders' : settings.orderMode === 'PAUSED' ? 'Temporarily paused' : 'Closed for today'}
                            </span>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                                {logoUrl ? (
                                    <Image
                                        src={logoUrl}
                                        alt={settings.restaurantName}
                                        width={32}
                                        height={32}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    getInitials(settings.restaurantName)
                                )}
                            </div>
                            <h3 className="truncate text-base font-semibold leading-snug">{settings.restaurantName || 'Restaurant name'}</h3>
                            <p className="mt-1 truncate text-xs sm:text-sm text-muted-foreground">{settings.tagline || 'Restaurant tagline'}</p>
                            <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                                <p className="flex items-center gap-2 truncate">
                                    <Phone className="size-3.5 sm:size-4 shrink-0" />
                                    <span className="truncate">{settings.phone || 'Phone number'}</span>
                                </p>
                                <p className="flex items-center gap-2 truncate">
                                    <Mail className="size-3.5 sm:size-4 shrink-0" />
                                    <span className="truncate">{settings.email || 'Email address'}</span>
                                </p>
                                <p className="flex items-center gap-2 truncate">
                                    <MapPin className="size-3.5 sm:size-4 shrink-0" />
                                    <span className="truncate">{settings.address || 'Restaurant address'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <SettingsPanel
                        icon={<Bell className="size-5" />}
                        title="Notifications"
                        description="Choose which operational alerts should be active."
                    >
                        <div className="space-y-3">
                            <ToggleRow
                                title="Auto accept orders"
                                description="Move incoming orders directly into preparation."
                                enabled={settings.autoAcceptOrders}
                                onToggle={() => updateSetting('autoAcceptOrders', !settings.autoAcceptOrders)}
                            />
                        </div>
                    </SettingsPanel>

                    <SettingsPanel
                        icon={<Utensils className="size-5" />}
                        title="Service availability"
                        description="Control which service types customers can use."
                    >
                        <div className="space-y-3">
                            <ToggleRow
                                title="Dine-in orders"
                                description="Allow customers to place dine-in orders."
                                enabled={settings.dineInEnabled}
                                onToggle={() => updateSetting('dineInEnabled', !settings.dineInEnabled)}
                            />
                            <ToggleRow
                                title="Delivery orders"
                                description="Allow customers to place delivery orders."
                                enabled={settings.deliveryEnabled}
                                onToggle={() => updateSetting('deliveryEnabled', !settings.deliveryEnabled)}
                            />
                        </div>
                    </SettingsPanel>
                </aside>
            </div>
        </div>
    );
}



