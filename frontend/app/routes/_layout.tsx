import { ConnectButton } from "@rainbow-me/rainbowkit";
import * as React from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useAccount } from "wagmi";
import { userIsOwner } from "~/lib/hooks";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { HamburgerMenuIcon, HomeIcon, HeartFilledIcon, DashboardIcon, PersonIcon, Cross1Icon } from "@radix-ui/react-icons"


const BrandLogo = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">Æ</span>
        </div>
        <span className="text-xl font-bold text-gray-900">Æquo</span>
    </div>
);

export default function Layout(): React.ReactElement {
    const { isConnected } = useAccount();
    const isOwner = userIsOwner();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const NavMenu = () => {
        return (
            <NavigationMenu className="hidden md:flex" viewport={false}>
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} ${location.pathname === "/" ? "bg-accent text-accent-foreground" : ""}`}>
                            <Link to="/">
                                <HomeIcon className="mr-2 w-4 h-4" /> Accueil
                            </Link>
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                    {isConnected && (
                        <NavigationMenuItem>
                            <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} ${location.pathname === "/dashboard" ? "bg-accent text-accent-foreground" : ""}`}>
                                <Link to="/dashboard">
                                    <DashboardIcon className="mr-2 w-4 h-4" /> Dashboard
                                </Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    )}
                    <NavigationMenuItem>
                        <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} ${location.pathname === "/association" ? "bg-accent text-accent-foreground" : ""}`}>
                            <Link to="/association">
                                <HeartFilledIcon className="mr-2 w-4 h-4" /> Associations
                            </Link>
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                    {isConnected && isOwner && (
                        <NavigationMenuItem>
                            <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} ${location.pathname === "/admin" ? "bg-accent text-accent-foreground" : ""}`}>
                                <Link to="/admin">
                                    <PersonIcon className="mr-2 w-4 h-4" /> Administration
                                </Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    )}
                </NavigationMenuList>
            </NavigationMenu>
        );
    };

    const MobileMenu = () => {
        if (!isMobileMenuOpen) return null;
        
        return (
            <>
                {/* Overlay - ne couvre pas le header */}
                <div 
                    className="md:hidden fixed top-[73px] inset-x-0 bottom-0 bg-black/20 z-30 animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
                
                {/* Menu Panel */}
                <div className="md:hidden fixed top-[73px] left-0 right-0 w-full bg-white shadow-lg z-30 animate-in slide-in-from-top duration-300 border-b border-gray-200 rounded-b-lg">
                    <nav className="flex flex-col p-3 gap-1">
                        <Link 
                            to="/" 
                            className={`flex items-center text-sm font-medium py-2 px-4 rounded-md transition-colors ${location.pathname === "/" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <HomeIcon className="mr-2 w-4 h-4" /> Accueil
                        </Link>
                        {isConnected && (
                            <Link 
                                to="/dashboard" 
                                className={`flex items-center text-sm font-medium py-2 px-4 rounded-md transition-colors ${location.pathname === "/dashboard" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <DashboardIcon className="mr-2 w-4 h-4" /> Dashboard
                            </Link>
                        )}
                        <Link 
                            to="/association" 
                            className={`flex items-center text-sm font-medium py-2 px-4 rounded-md transition-colors ${location.pathname === "/association" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <HeartFilledIcon className="mr-2 w-4 h-4" /> Associations
                        </Link>
                        {isConnected && isOwner && (
                            <Link 
                                to="/admin" 
                                className={`flex items-center text-sm font-medium py-2 px-4 rounded-md transition-colors ${location.pathname === "/admin" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <PersonIcon className="mr-2 w-4 h-4" /> Administration
                            </Link>
                        )}
                        <div className="pt-3 border-t border-gray-200 mt-2">
                            <ConnectButton />
                        </div>
                    </nav>
                </div>
            </>
        );
    };

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-sm bg-white/95">
                <div className="flex justify-between items-center px-4 md:px-8 py-4">
                    <Link to="/" className="shrink-0">
                        <BrandLogo />
                    </Link>
                    
                    <div className="hidden md:flex items-center gap-6">
                        <NavMenu />
                    </div>
                    
                    <div className="hidden md:flex items-center">
                        <ConnectButton />
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden"
                        aria-label="Menu"
                    >
                        {isMobileMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon width={24} height={24} />}
                    </Button>
                </div>
            </header>
            
             <MobileMenu />
            
            <main className="min-h-[80vh] mx-auto">
                <Outlet />
            </main>
            
            <footer className="bg-gray-50 border-t border-gray-100 mt-20">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="md:col-span-2">
                            <BrandLogo />
                            <p className="text-sm text-gray-600 mt-4 max-w-md">
                                Plateforme de gouvernance décentralisée pour associations et organisations. Transparent, sécurisé et démocratique.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Navigation</h3>
                            <ul className="space-y-3 text-sm">
                                <li><Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">Accueil</Link></li>
                                <li><Link to="/association" className="text-gray-600 hover:text-gray-900 transition-colors">Associations</Link></li>
                                {isConnected && <li><Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">Dashboard</Link></li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Ressources</h3>
                            <ul className="space-y-3 text-sm">
                                <li><a href="https://github.com/CygiK/Aequo/wiki" className="text-gray-600 hover:text-gray-900 transition-colors">Documentation</a></li>
                                <li><a href="https://github.com/CygiK/Aequo/discussions/categories/q-a" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a></li>
                                <li>
                                    <a href="https://github.com/CygiK/Aequo" className="text-gray-600 hover:text-gray-900 transition-colors"> GitHub</a>
                                    </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
                        <p>&copy; {new Date().getFullYear()} Æquo Protocol. Tous droits réservés.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-gray-900 transition-colors">Confidentialité</a>
                            <a href="#" className="hover:text-gray-900 transition-colors">Conditions</a>
                            <a href="#" className="hover:text-gray-900 transition-colors">Cookies</a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}