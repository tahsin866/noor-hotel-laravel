import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <div className="flex w-full flex-col items-center justify-center space-y-6">
                {/* 1. Centered Header Section */}
                <div className="flex w-full flex-col items-center justify-center text-center px-4">
                    <h1 className="text-[40px] font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500 bg-clip-text text-transparent whitespace-nowrap text-center">
                        নুরহোটেল এন্ড রেস্টুরেন্ট 
                    </h1> 
                    <p className="mt-2 text-sm font-medium text-muted-foreground text-center">
                        সাইন-ইন করতে আপনার অ্যাকাউন্ট তথ্য দিন
                    </p>
                </div>

                {status && (
                    <div className="w-full max-w-[400px] rounded-sm bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {status}
                    </div>
                )}

                {/* 2. Card Section */}
                <div className="w-full max-w-[400px] rounded-sm border border-emerald-500/20 bg-card/95 p-6 shadow-xl shadow-emerald-500/5 backdrop-blur-sm">
                    <PasskeyVerify />

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                                        Email address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="name@example.com"
                                        className="h-10 rounded-sm border-input bg-background/50 text-sm transition-all focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                                            Password
                                        </Label>
                                        {canResetPassword && (
                                            <TextLink
                                                href={request()}
                                                className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors"
                                                tabIndex={5}
                                            >
                                                Forgot password?
                                            </TextLink>
                                        )}
                                    </div>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="h-10 rounded-sm border-input bg-background/50 text-sm transition-all focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center space-x-2 pt-1">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        tabIndex={3}
                                        className="rounded-sm border-input data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                    />
                                    <Label 
                                        htmlFor="remember" 
                                        className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
                                    >
                                        Remember me for 30 days
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="h-10 w-full rounded-sm font-medium text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing ? (
                                        <Spinner className="mr-2 h-4 w-4" />
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </div>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}

Login.layout = {
    title: '',
    description: '',
};