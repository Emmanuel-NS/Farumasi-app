package com.farumasi.farumasi_app

import android.os.Bundle
import androidx.work.WorkManager
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Purge legacy Workmanager jobs that showed "dartTask: Success" debug toasts.
        try {
            WorkManager.getInstance(applicationContext).cancelAllWork()
        } catch (_: Exception) {
        }
    }
}
