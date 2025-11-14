package com.example.IOT.Service;

import com.example.IOT.Entity.ActionHistory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class DeviceControlService {
    
    // Map để lưu các request đang chờ phản hồi
    // Key: device name (DEV1, DEV2, DEV3)
    // Value: CompletableFuture chờ kết quả
    private final Map<String, CompletableFuture<ActionHistory>> pendingRequests = new ConcurrentHashMap<>();

    public CompletableFuture<ActionHistory> createPendingRequest(String device) {
        CompletableFuture<ActionHistory> future = new CompletableFuture<>();
        pendingRequests.put(device, future);
        
        // Timeout sau 2 giây nếu không có phản hồi
        CompletableFuture.delayedExecutor(4, TimeUnit.SECONDS).execute(() -> {
            if (!future.isDone()) {
                future.completeExceptionally(new RuntimeException("Timeout: No response from device"));
                pendingRequests.remove(device);
            }
        });
        
        return future;
    }
    
    /**
     * Hoàn thành request khi nhận được status từ ESP8266
     */
    public void completeRequest(String device, ActionHistory actionHistory) {
        CompletableFuture<ActionHistory> future = pendingRequests.remove(device);
        if (future != null && !future.isDone()) {
            future.complete(actionHistory);
            System.out.println("✅ Completed request for device: " + device);
        }
    }
    
    /**
     * Hủy request nếu có lỗi
     */
    public void cancelRequest(String device, String errorMessage) {
        CompletableFuture<ActionHistory> future = pendingRequests.remove(device);
        if (future != null && !future.isDone()) {
            future.completeExceptionally(new RuntimeException(errorMessage));
        }
    }
}
