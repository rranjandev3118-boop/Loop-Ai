import { NextResponse } from "next/server";
import { healthChecker, performanceMonitor } from "@/lib/monitoring";
import { memoryMonitor } from "@/lib/performance";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run health checks
    const healthResult = await healthChecker.runChecks();
    
    // Get performance metrics
    const metrics = performanceMonitor.getAllMetrics();
    
    // Get memory usage
    const memoryUsage = memoryMonitor.getMemoryUsage();
    const memoryPressure = memoryMonitor.checkMemoryPressure();
    
    const response = {
      status: healthResult.status,
      timestamp: new Date().toISOString(),
      checks: healthResult.checks,
      performance: {
        metrics,
        responseTime: Date.now() - startTime
      },
      system: {
        memory: memoryUsage,
        memoryPressure
      }
    };
    
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json({ 
      status: "unhealthy", 
      error: "Health check failed",
      timestamp: new Date().toISOString() 
    }, { status: 503 });
  }
}
