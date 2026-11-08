package app.together.couple;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Свой плагин (виджет и проверка Firebase) нужно зарегистрировать до super.onCreate
        registerPlugin(TogetherNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
