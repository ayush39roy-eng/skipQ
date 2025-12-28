import { View, Text, StyleSheet, Image, Pressable, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { User, Settings, HelpCircle, LogOut, ChevronRight, Heart, Shield } from 'lucide-react-native';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import { useMemo } from 'react';
import { MotiView } from 'moti';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    const menuItems = useMemo(() => [
        { icon: User, label: 'Edit Profile', sub: 'Name, Phone, Email' },
        { icon: Heart, label: 'Favorites', sub: 'Your best loved food spots' },
        { icon: Settings, label: 'Settings', sub: 'Notifications, Privacy' },
        { icon: HelpCircle, label: 'Help & Support', sub: 'FAQs, Contact Us' },
        { icon: Shield, label: 'Terms & Policies', sub: 'T&C, Privacy Policy' },
    ], []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>PROFILE</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* User Card */}
                <MotiView 
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: 100 }}
                    style={styles.userCard}
                >
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60' }}
                        style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>SkipQ User</Text>
                        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role || 'STUDENT'}</Text>
                        </View>
                    </View>
                </MotiView>

                {/* Menu Options */}
                {/* Menu Options */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                transition={{ type: 'timing', duration: 500, delay: 200 + index * 100 }}
                            >
                                <Pressable style={styles.menuItem}>
                                    <View style={styles.menuIconBox}>
                                        <Icon size={20} color={GAME_UI.ink} />
                                    </View>
                                    <View style={styles.menuContent}>
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                        <Text style={styles.menuSub}>{item.sub}</Text>
                                    </View>
                                    <ChevronRight size={20} color="#334155" />
                                </Pressable>
                            </MotiView>
                        );
                    })}
                </View>

                {/* Logout Button */}
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>LOG OUT</Text>
                </Pressable>

                <Text style={styles.version}>Version 1.0.0 • Made with ❤️ by SkipQ</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GAME_UI.background },
    header: { padding: 16, paddingTop: 60, backgroundColor: GAME_UI.background, borderBottomWidth: 3, borderBottomColor: GAME_UI.ink },
    headerTitle: { fontSize: 32, fontWeight: '900', color: GAME_UI.ink, textTransform: 'uppercase' },

    scrollContent: { padding: 16 },

    userCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 20, 
        borderRadius: 16, 
        marginBottom: 24, 
        backgroundColor: GAME_UI.white, 
        ...GAME_UI.shadows.md
    },
    avatar: { width: 70, height: 70, borderRadius: 8, borderWidth: 2, borderColor: GAME_UI.ink, backgroundColor: GAME_UI.secondary },
    userInfo: { marginLeft: 16 },
    userName: { color: GAME_UI.ink, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
    userEmail: { color: GAME_UI.ink, fontSize: 14, marginTop: 2 },
    roleBadge: { 
        backgroundColor: GAME_UI.tertiary, // Mint
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 4, 
        alignSelf: 'flex-start', 
        marginTop: 8,
        borderWidth: 1,
        borderColor: GAME_UI.ink
    },
    roleText: { color: GAME_UI.ink, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

    menuContainer: { 
        backgroundColor: GAME_UI.white, 
        borderRadius: 16, 
        padding: 8,
        ...GAME_UI.shadows.sm
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    menuIconBox: { 
        width: 40, 
        height: 40, 
        borderRadius: 8, 
        backgroundColor: GAME_UI.primaryBtn, // Apricot
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 16,
        borderWidth: 1,
        borderColor: GAME_UI.ink
    },
    menuContent: { flex: 1 },
    menuLabel: { color: GAME_UI.ink, fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
    menuSub: { color: GAME_UI.ink, fontSize: 12, marginTop: 2, opacity: 0.6 },

    logoutBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: GAME_UI.white, 
        padding: 16, 
        borderRadius: 12, 
        marginTop: 24, 
        gap: 8,
        ...GAME_UI.shadows.sm,
        borderColor: '#ef4444',
        shadowColor: '#ef4444' // Red shadow for logout
    },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },

    version: { textAlign: 'center', color: GAME_UI.ink, marginTop: 24, fontSize: 12, opacity: 0.5, fontWeight: '700' }
});
