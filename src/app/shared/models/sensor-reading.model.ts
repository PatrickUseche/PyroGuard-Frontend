export interface SensorReading{
    node_id: string;
    temperature: number;
    humidity: number;
    smoke: number;
    flame: boolean;
    timestamp: string;
}