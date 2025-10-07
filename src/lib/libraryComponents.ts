import type { CycleComponent } from "../types/common/CycleComponent";

export const LIBRARY_COMPONENTS: CycleComponent[] = [
    {
        "id": "library_cold_valve_001",
        "label": "Cold Valve1",
        "start": 0,
        "compId": "Cold Valve",
        "duration": 6000,
        "motorConfig": undefined
    },
    {
        "id": "library_detergent_valve_001",
        "label": "Cold Valve2",
        "start": 0,
        "compId": "Detergent Valve",
        "duration": 2500,
        "motorConfig": undefined
    },
    {
        "id": "library_softener_valve_001",
        "label": "Fabric Softener Release",
        "start": 0,
        "compId": "Softener Valve",
        "duration": 1500,
        "motorConfig": undefined
    },
    {
        "id": "library_hot_valve_001",
        "label": "Hot Valve",
        "start": 0,
        "compId": "Hot Valve",
        "duration": 5000,
        "motorConfig": undefined
    },
    {
        "id": "library_motor_001",
        "label": "Motor",
        "start": 0,
        "compId": "Motor",
        "duration": 60000,
        "motorConfig": {
            "pattern": [
                {
                    "stepTime": 4000,
                    "direction": "cw",
                    "pauseTime": 500
                }
            ],
            "repeatTimes": 5,
            "runningStyle": "Single Direction"
        }
    },
    {
        "id": "library_drain_pump_001",
        "label": "Standard Drain Pump",
        "start": 0,
        "compId": "Drain Pump",
        "duration": 4000,
        "motorConfig": undefined
    },
    {
        "id": "library_retractor_001",
        "label": "Standard Retractor Cycle",
        "start": 0,
        "compId": "Retractor",
        "duration": 3000,
        "motorConfig": undefined
    }
];

// Helper function to get library components (for consistency with existing API)
export const getLibraryComponents = (): Promise<CycleComponent[]> => {
    return Promise.resolve(LIBRARY_COMPONENTS);
};

// Helper function to find a specific component by compId
export const findLibraryComponent = (compId: string): CycleComponent | undefined => {
    return LIBRARY_COMPONENTS.find(component => component.compId === compId);
};

// Helper function to get component by ID
export const getLibraryComponentById = (id: string): CycleComponent | undefined => {
    return LIBRARY_COMPONENTS.find(component => component.id === id);
};