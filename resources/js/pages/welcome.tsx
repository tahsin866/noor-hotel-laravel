import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
import { register } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Noor Hotel & Restaurant" />
            <div className="min-h-screen bg-white">
                {/* Navigation */}
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                    <nav className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">N</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900">Noor Hotel</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</a>
                            <a href="#services" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Services</a>
                            <a href="#rooms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Rooms</a>
                            <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
                        </div>
                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                    </svg>
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"></div>
                    <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl"></div>
                    <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl"></div>
                    <div className="relative mx-auto max-w-7xl px-6">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 mb-6">
                                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span className="text-sm font-medium text-amber-800">Welcome to Noor Hotel PRG</span>
                                </div>
                                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                                    Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Elegance</span> Meets Comfort
                                </h1>
                                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                    Experience the perfect blend of traditional hospitality and modern luxury. 
                                    From our exquisite restaurant to our comfortable rooms, every detail is 
                                    crafted for your satisfaction.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <a
                                        href="#rooms"
                                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
                                    >
                                        Explore Rooms
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </a>
                                    <a
                                        href="#contact"
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Book a Table
                                    </a>
                                </div>
                            </div>
                            <div className="relative hidden lg:block">
                                <div className="aspect-square rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-1">
                                    <div className="h-full w-full rounded-3xl bg-white p-8 flex flex-col items-center justify-center">
                                        <div className="text-6xl mb-4">&#127860;</div>
                                        <div className="text-2xl font-bold text-gray-900 mb-2">Fine Dining</div>
                                        <div className="text-gray-500">Authentic Cuisine</div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">5-Star Rated</div>
                                            <div className="text-xs text-gray-500">1000+ Happy Guests</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-16 bg-white border-y border-gray-100">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-gray-900 mb-1">15+</div>
                                <div className="text-sm text-gray-500">Years Experience</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-gray-900 mb-1">50+</div>
                                <div className="text-sm text-gray-500">Luxury Rooms</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-gray-900 mb-1">1000+</div>
                                <div className="text-sm text-gray-500">Happy Guests</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-gray-900 mb-1">4.9</div>
                                <div className="text-sm text-gray-500">Star Rating</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="relative">
                                <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                    <div className="h-full w-full flex flex-col items-center justify-center p-8">
                                        <div className="text-8xl mb-6">&#127968;</div>
                                        <div className="text-xl font-bold text-gray-700">Noor Hotel PRG</div>
                                        <div className="text-gray-500 mt-2">Est. 2010</div>
                                    </div>
                                </div>
                                <div className="absolute -top-4 -right-4 rounded-2xl bg-amber-500 p-6 shadow-xl">
                                    <div className="text-2xl font-bold text-white">15+</div>
                                    <div className="text-sm text-amber-100">Years</div>
                                </div>
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 mb-4">
                                    <span className="text-sm font-medium text-amber-800">About Us</span>
                                </div>
                                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                                    A Legacy of <span className="text-amber-500">Hospitality</span>
                                </h2>
                                <p className="text-gray-600 mb-6 leading-relaxed">
                                    For over 15 years, Noor Hotel PRG has been a cornerstone of premium hospitality 
                                    in our community. We combine traditional warmth with contemporary amenities to 
                                    create an unforgettable experience for every guest.
                                </p>
                                <p className="text-gray-600 mb-8 leading-relaxed">
                                    Our commitment to excellence extends from our meticulously maintained rooms 
                                    to our world-class restaurant, where our chefs craft dishes that celebrate 
                                    both local flavors and international cuisines.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Premium Rooms</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 11-3.048-5.196 3.354 3.354 0 013.048 5.196zM12 13.5c-3.12 0-5.625-2.096-5.625-4.679 0-2.583 2.505-4.679 5.625-4.679s5.625 2.096 5.625 4.679C17.625 11.404 15.12 13.5 12 13.5z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Fine Dining</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Prime Location</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">24/7 Service</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="py-24 bg-gray-50">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 mb-4">
                                <span className="text-sm font-medium text-amber-800">Our Services</span>
                            </div>
                            <h2 className="text-4xl font-bold text-gray-900 mb-4">
                                What We <span className="text-amber-500">Offer</span>
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                From comfortable accommodations to exceptional dining, we provide everything 
                                you need for a memorable stay.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="group rounded-2xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">&#128716;</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Premium Rooms</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Luxuriously appointed rooms with modern amenities, plush bedding, 
                                    and stunning views for a restful stay.
                                </p>
                            </div>
                            <div className="group rounded-2xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">&#127860;</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Fine Dining</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Savor exquisite dishes crafted by our expert chefs, featuring a blend 
                                    of local and international cuisines.
                                </p>
                            </div>
                            <div className="group rounded-2xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">&#128197;</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Event Spaces</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Versatile venues for weddings, conferences, and special occasions 
                                    with dedicated planning support.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Rooms Section */}
                <section id="rooms" className="py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 mb-4">
                                <span className="text-sm font-medium text-amber-800">Our Rooms</span>
                            </div>
                            <h2 className="text-4xl font-bold text-gray-900 mb-4">
                                Choose Your <span className="text-amber-500">Perfect Stay</span>
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                Select from our range of elegantly designed rooms, each offering 
                                a unique blend of comfort and style.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <span className="text-6xl">&#128716;</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xl font-bold text-gray-900">Standard Room</h3>
                                        <span className="text-amber-500 font-bold">Tk 2,500</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Comfortable rooms with essential amenities</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Wi-Fi</span>
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">AC</span>
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">TV</span>
                                    </div>
                                </div>
                            </div>
                            <div className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 ring-2 ring-amber-500">
                                <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                    <span className="text-6xl">&#127968;</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xl font-bold text-gray-900">Deluxe Room</h3>
                                        <span className="text-amber-500 font-bold">Tk 4,000</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Spacious rooms with premium facilities</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-amber-100 text-xs text-amber-700">Wi-Fi</span>
                                        <span className="px-3 py-1 rounded-full bg-amber-100 text-xs text-amber-700">AC</span>
                                        <span className="px-3 py-1 rounded-full bg-amber-100 text-xs text-amber-700">Minibar</span>
                                        <span className="px-3 py-1 rounded-full bg-amber-100 text-xs text-amber-700">Balcony</span>
                                    </div>
                                </div>
                            </div>
                            <div className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <span className="text-6xl">&#127982;</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xl font-bold text-gray-900">Suite</h3>
                                        <span className="text-amber-500 font-bold">Tk 6,500</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Luxury suites with separate living area</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Wi-Fi</span>
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">AC</span>
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Jacuzzi</span>
                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Butler</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="py-24 bg-gray-900">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid lg:grid-cols-2 gap-16">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1.5 mb-4">
                                    <span className="text-sm font-medium text-amber-400">Contact Us</span>
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-6">
                                    Get in <span className="text-amber-400">Touch</span>
                                </h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    Ready to experience Noor Hotel PRG? Reach out to us for reservations, 
                                    inquiries, or special requests. Our team is here to help.
                                </p>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-white font-medium mb-1">Address</div>
                                            <div className="text-gray-400">Dhaka, Bangladesh</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-white font-medium mb-1">Phone</div>
                                            <div className="text-gray-400">+880 1XXXXXXXXX</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-white font-medium mb-1">Working Hours</div>
                                            <div className="text-gray-400">24/7 Front Desk</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/5 backdrop-blur-sm p-8">
                                <h3 className="text-xl font-bold text-white mb-6">Send a Message</h3>
                                <form className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">First Name</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                placeholder="John"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Last Name</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Email</label>
                                        <input
                                            type="email"
                                            className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Message</label>
                                        <textarea
                                            rows={4}
                                            className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                            placeholder="How can we help you?"
                                        ></textarea>
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
                                    >
                                        Send Message
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 bg-gray-950 border-t border-white/10">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">N</span>
                                </div>
                                <span className="text-xl font-bold text-white">Noor Hotel PRG</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                </a>
                                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.146 0 7.367 2.954 7.367 6.899 0 4.115-2.593 7.425-6.191 7.425-1.21 0-2.348-.629-2.738-1.373l-.746 2.851c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>
                                </a>
                                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                </a>
                            </div>
                            <div className="text-gray-500 text-sm">
                                &copy; {new Date().getFullYear()} Noor Hotel PRG. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}