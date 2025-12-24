import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ onFinish }) => {


    useEffect(() => {
        // Wait 2 seconds, then call onFinish
        const timer = setTimeout(() => {
            if (onFinish) {
                onFinish();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: 1, // Static opacity
                    // No scale transform
                },
            ]}
        >
            <View style={styles.content}>
                {/* Logo Section */}
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.mainLogo}
                    resizeMode="contain"
                />

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Southern Province Real-time Bus Tracking System
                </Text>

                {/* Bottom Section */}
                <View style={styles.bottomContainer}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.bottomText}>100% PEO</Text>
                    <Text style={styles.bottomText}>Ceylon Product</Text>
                    <Text style={styles.copyright}>
                        Developed by ALITIAN | @2025 SPGPS. All rights reserved.
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 9999,
        elevation: 9999,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    mainLogo: {
        width: 180,
        height: 60,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 11,
        color: '#777777',
        textAlign: 'center',
        marginTop: 5,
        letterSpacing: 0.3,
        fontWeight: '500',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 40,
        alignItems: 'center',
    },
    logoImage: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    bottomText: {
        fontSize: 12,
        color: '#2C2C2C',
        fontWeight: '600',
    },
    copyright: {
        fontSize: 10,
        color: '#999999',
        marginTop: 15,
        textAlign: 'center',
    },
});

export default LoadingScreen;
