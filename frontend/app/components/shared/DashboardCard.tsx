import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { RocketIcon, BarChartIcon, DashboardIcon, HeartIcon, TargetIcon } from "@radix-ui/react-icons";

const colorStyles = {
    blue: {
        accent: 'text-blue-600',
        iconBg: 'bg-gray-100',
        iconAccent: 'text-blue-600',
        icon: RocketIcon
    },
    green: {
        accent: 'text-green-600',
        iconBg: 'bg-gray-100',
        iconAccent: 'text-green-600',
        icon: BarChartIcon
    },
    black: {
        accent: 'text-gray-900',
        iconBg: 'bg-gray-100',
        iconAccent: 'text-gray-700',
        icon: DashboardIcon
    },
    purple: {
        accent: 'text-purple-600',
        iconBg: 'bg-gray-100',
        iconAccent: 'text-purple-600',
        icon: HeartIcon
    },
    orange: {
        accent: 'text-orange-600',
        iconBg: 'bg-gray-100',
        iconAccent: 'text-orange-600',
        icon: TargetIcon
    },
};

export function DashboardCard({
    displayValue,
    cardTitle,
    color = 'black',
    tokenName = "USDC",
}: {
    displayValue: string;
    tokenName?: string;
    cardTitle: string;
    color?: 'blue' | 'green' | 'black' | 'purple' | 'orange';
}): React.ReactElement {
    const style = colorStyles[color];
    const IconComponent = style.icon;

    return (
        <Card className="relative overflow-hidden bg-white border border-gray-200 hover:shadow-2xl hover:border-gray-300 transition-all duration-500 hover:-translate-y-1 group">
            {/* Ligne d'accent colorée en haut */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${style.accent} opacity-60`} />
            
            {/* Effet de brillance subtil au survol */}
            <div className="absolute inset-0 bg-linear-to-br from-gray-50/0 via-gray-50/50 to-gray-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardHeader className="relative space-y-3 p-5">
                <div className="flex items-start justify-between">
                    <CardDescription className="font-semibold text-gray-500 uppercase text-xs tracking-wider">
                        {cardTitle}
                    </CardDescription>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${style.iconBg} border border-gray-200 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                        <IconComponent className={`w-5 h-5 ${style.iconAccent}`} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <CardTitle className={`text-3xl font-bold ${style.accent} tracking-tight`}>
                        {displayValue}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{tokenName}</p>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                </div>
            </CardHeader>
            
            {/* Ombre douce en bas */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent" />
        </Card>
    );
}