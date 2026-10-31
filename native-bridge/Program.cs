using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;

namespace NativeBridge
{
    class Program
    {
        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        private const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        private const byte VK_MEDIA_PREV_TRACK = 0xB1;
        private const byte VK_MEDIA_PLAY_PAUSE = 0xB3;

        private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
        private static string _lastJson = "";
        private static readonly object _lock = new();

        static async Task Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.InputEncoding = Encoding.UTF8;

            try
            {
                _sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
                if (_sessionManager != null)
                {
                    _sessionManager.CurrentSessionChanged += (s, e) => { EmitStatus(); };
                }
            }
            catch { }

            // Stdin background reader thread
            var inputThread = new Thread(() =>
            {
                while (true)
                {
                    try
                    {
                        string? line = Console.ReadLine();
                        if (line == null || line.Trim().Equals("exit", StringComparison.OrdinalIgnoreCase))
                        {
                            Environment.Exit(0);
                            break;
                        }

                        HandleCommand(line.Trim().ToLowerInvariant());
                    }
                    catch
                    {
                        break;
                    }
                }
            })
            {
                IsBackground = true
            };
            inputThread.Start();

            // Main loop: polls status and outputs updates
            while (true)
            {
                EmitStatus();
                Thread.Sleep(900);
            }
        }

        private static async void HandleCommand(string cmd)
        {
            try
            {
                var session = _sessionManager?.GetCurrentSession();

                if (cmd == "play-pause" || cmd == "toggle")
                {
                    if (session != null)
                    {
                        try { await session.TryTogglePlayPauseAsync(); } catch { SendMediaKey(VK_MEDIA_PLAY_PAUSE); }
                    }
                    else
                    {
                        SendMediaKey(VK_MEDIA_PLAY_PAUSE);
                    }
                }
                else if (cmd == "next")
                {
                    if (session != null)
                    {
                        try { await session.TrySkipNextAsync(); } catch { SendMediaKey(VK_MEDIA_NEXT_TRACK); }
                    }
                    else
                    {
                        SendMediaKey(VK_MEDIA_NEXT_TRACK);
                    }
                }
                else if (cmd == "prev")
                {
                    if (session != null)
                    {
                        try { await session.TrySkipPreviousAsync(); } catch { SendMediaKey(VK_MEDIA_PREV_TRACK); }
                    }
                    else
                    {
                        SendMediaKey(VK_MEDIA_PREV_TRACK);
                    }
                }
                else if (cmd == "status")
                {
                    EmitStatus(force: true);
                }

                // Immediately emit after command
                Thread.Sleep(150);
                EmitStatus();
            }
            catch { }
        }

        private static void SendMediaKey(byte vk)
        {
            keybd_event(vk, 0, 0, UIntPtr.Zero);
            keybd_event(vk, 0, 2, UIntPtr.Zero); // KEYEVENTF_KEYUP = 2
        }

        private static void EmitStatus(bool force = false)
        {
            lock (_lock)
            {
                var payload = GetCurrentMediaPayload().GetAwaiter().GetResult();
                string json = JsonSerializer.Serialize(payload);

                if (force || json != _lastJson)
                {
                    _lastJson = json;
                    Console.WriteLine("MEDIA_UPDATE:" + json);
                }
            }
        }

        private static async Task<Dictionary<string, object>> GetCurrentMediaPayload()
        {
            // 1. Try Windows SMTC first
            try
            {
                if (_sessionManager != null)
                {
                    var session = _sessionManager.GetCurrentSession();
                    if (session != null)
                    {
                        var mediaProps = await session.TryGetMediaPropertiesAsync();
                        var playbackInfo = session.GetPlaybackInfo();

                        if (mediaProps != null && !string.IsNullOrWhiteSpace(mediaProps.Title))
                        {
                            string status = playbackInfo?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing
                                ? "playing"
                                : "paused";

                            string source = session.SourceAppUserModelId ?? "Media";
                            if (source.Contains("Spotify", StringComparison.OrdinalIgnoreCase))
                            {
                                source = "Spotify";
                            }

                            return new Dictionary<string, object>
                            {
                                ["running"] = true,
                                ["status"] = status,
                                ["title"] = mediaProps.Title,
                                ["artist"] = mediaProps.Artist ?? "",
                                ["album"] = mediaProps.AlbumTitle ?? "",
                                ["source"] = source
                            };
                        }
                    }
                }
            }
            catch { }

            // 2. Fallback to Spotify Process Window Title
            var spotifyProcesses = Process.GetProcessesByName("spotify");
            if (spotifyProcesses.Length == 0)
            {
                return new Dictionary<string, object>
                {
                    ["running"] = false,
                    ["status"] = "not_running",
                    ["title"] = "",
                    ["artist"] = "",
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            string? spotTitle = GetSpotifyWindowTitle(spotifyProcesses);

            if (!string.IsNullOrEmpty(spotTitle) && spotTitle.Contains(" - "))
            {
                int sep = spotTitle.IndexOf(" - ", StringComparison.Ordinal);
                string artist = spotTitle.Substring(0, sep).Trim();
                string title = spotTitle.Substring(sep + 3).Trim();

                return new Dictionary<string, object>
                {
                    ["running"] = true,
                    ["status"] = "playing",
                    ["title"] = title,
                    ["artist"] = artist,
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            if (!string.IsNullOrEmpty(spotTitle))
            {
                return new Dictionary<string, object>
                {
                    ["running"] = true,
                    ["status"] = "paused",
                    ["title"] = "",
                    ["artist"] = "",
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            return new Dictionary<string, object>
            {
                ["running"] = true,
                ["status"] = "idle",
                ["title"] = "",
                ["artist"] = "",
                ["album"] = "",
                ["source"] = "Spotify"
            };
        }

        private static string? GetSpotifyWindowTitle(Process[] procs)
        {
            var pids = new HashSet<uint>();
            foreach (var p in procs) pids.Add((uint)p.Id);

            string? result = null;

            EnumWindows((hWnd, lParam) =>
            {
                GetWindowThreadProcessId(hWnd, out uint pid);
                if (pids.Contains(pid))
                {
                    var sb = new StringBuilder(512);
                    GetWindowText(hWnd, sb, 512);
                    string t = sb.ToString().Trim();

                    if (!string.IsNullOrEmpty(t) && t != "AngleHiddenWindow" && t != "Default IME" && t != "MSCTFIME UI")
                    {
                        if (t.Contains(" - "))
                        {
                            result = t;
                            return false; // Stop enumeration
                        }
                        if (result == null && (t == "Spotify" || t.StartsWith("Spotify ")))
                        {
                            result = t;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);

            return result;
        }
    }
}
