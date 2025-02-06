import { ViroPolyline } from '@reactvision/react-viro';
import React from 'react';

export function Axes() {
    // Each line: from origin to 1 unit along that axis
    return (
        <>
            {/* X-axis in red */}
            <ViroPolyline
                points={[
                    [0, 0, 0],
                    [10, 0, 0]
                ]}

                thickness={0.02} // make it visible
                materials={['redLine']}
            />
            {/* Y-axis in green */}
            <ViroPolyline
                points={[
                    [0, 0, 0],
                    [0, 10, 0]
                ]}
                thickness={0.02}
                materials={['greenLine']}
            />
            {/* Z-axis in blue */}
            <ViroPolyline
                points={[
                    [0, 0, 0],
                    [0, 0, 10]
                ]}

                thickness={0.02}
                materials={['blueLine']}
            />
        </>
    );
}